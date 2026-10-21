-- ============================================================================
-- TechCare - Migración Sprint 5 (HU4)
-- Archivo: supabase/migrations/20261021_02_checklist_rls_triggers.sql
-- Propósito: Triggers de negocio, RLS, generación automática de Parte 1 e índices
-- ============================================================================

-- 1. Índice de rendimiento para consultas de checklist por orden
CREATE INDEX IF NOT EXISTS idx_checklist_item_id_orden ON checklist_item(id_orden);

-- ----------------------------------------------------------------------------
-- 2. Trigger de auditoría: fecha_marcado en checklist_item
--    Fija fecha_marcado = now() al completar y NULL al desmarcar
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_fn_actualizar_fecha_marcado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completado = true AND (OLD.completado IS DISTINCT FROM true) THEN
    NEW.fecha_marcado := now();
  ELSIF NEW.completado = false AND (OLD.completado IS DISTINCT FROM false) THEN
    NEW.fecha_marcado := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_fecha_marcado ON checklist_item;
CREATE TRIGGER trg_actualizar_fecha_marcado
  BEFORE UPDATE OF completado ON checklist_item
  FOR EACH ROW
  EXECUTE FUNCTION tg_fn_actualizar_fecha_marcado();

-- ----------------------------------------------------------------------------
-- 3. Trigger de integridad: Bloquear cierre de orden con tareas obligatorias pendientes (CP-05)
--    Emite excepción con código P0001 y mensaje genérico si hay pendientes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_fn_bloquear_cierre_orden_incompleta()
RETURNS TRIGGER AS $$
DECLARE
  v_pendientes integer;
BEGIN
  IF NEW.cerrada = true AND (OLD.cerrada IS DISTINCT FROM true) THEN
    SELECT count(*) INTO v_pendientes
    FROM checklist_item
    WHERE id_orden = NEW.id_orden
      AND obligatorio = true
      AND completado = false;

    IF v_pendientes > 0 THEN
      RAISE EXCEPTION 'No se puede cerrar la orden de servicio: existen tareas obligatorias pendientes.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bloquear_cierre_orden ON orden_servicio;
CREATE TRIGGER trg_bloquear_cierre_orden
  BEFORE UPDATE OF cerrada ON orden_servicio
  FOR EACH ROW
  EXECUTE FUNCTION tg_fn_bloquear_cierre_orden_incompleta();

-- ----------------------------------------------------------------------------
-- 4. Trigger de inmutabilidad: Prohibir modificaciones en ítems de orden cerrada
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_fn_bloquear_edicion_orden_cerrada()
RETURNS TRIGGER AS $$
DECLARE
  v_cerrada boolean;
  v_id_orden uuid;
BEGIN
  v_id_orden := COALESCE(NEW.id_orden, OLD.id_orden);
  SELECT cerrada INTO v_cerrada
  FROM orden_servicio
  WHERE id_orden = v_id_orden;

  IF v_cerrada = true THEN
    RAISE EXCEPTION 'No se permite modificar ítems de una orden de servicio cerrada.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bloquear_edicion_orden_cerrada ON checklist_item;
CREATE TRIGGER trg_bloquear_edicion_orden_cerrada
  BEFORE INSERT OR UPDATE OR DELETE ON checklist_item
  FOR EACH ROW
  EXECUTE FUNCTION tg_fn_bloquear_edicion_orden_cerrada();

-- ----------------------------------------------------------------------------
-- 5. Trigger: Generar checklist Parte 1 al crear una orden de servicio
--    Genera: limpieza, ventiladores, pasta_termica (obligatorio = true)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_fn_generar_checklist_parte1()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO checklist_item (id_orden, tarea, obligatorio, completado)
  VALUES
    (NEW.id_orden, 'limpieza', true, false),
    (NEW.id_orden, 'ventiladores', true, false),
    (NEW.id_orden, 'pasta_termica', true, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generar_checklist_orden ON orden_servicio;
CREATE TRIGGER trg_generar_checklist_orden
  AFTER INSERT ON orden_servicio
  FOR EACH ROW
  EXECUTE FUNCTION tg_fn_generar_checklist_parte1();

-- ----------------------------------------------------------------------------
-- 6. Políticas de Seguridad por Fila (Row Level Security - RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE checklist_item ENABLE ROW LEVEL SECURITY;

-- 6.1 Administrador: acceso total
DROP POLICY IF EXISTS "Admin acceso total checklist_item" ON checklist_item;
CREATE POLICY "Admin acceso total checklist_item"
  ON checklist_item
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'service_role' OR
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'administrador' OR
    (auth.jwt() ->> 'email') LIKE '%admin%'
  );

-- 6.2 Técnico: lectura solo de sus propias órdenes
DROP POLICY IF EXISTS "Tecnico lee items de sus ordenes" ON checklist_item;
CREATE POLICY "Tecnico lee items de sus ordenes"
  ON checklist_item
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orden_servicio os
      WHERE os.id_orden = checklist_item.id_orden
        AND os.id_tecnico = auth.uid()
    )
  );

-- 6.3 Técnico: inserción solo en sus propias órdenes abiertas
DROP POLICY IF EXISTS "Tecnico inserta items en sus ordenes abiertas" ON checklist_item;
CREATE POLICY "Tecnico inserta items en sus ordenes abiertas"
  ON checklist_item
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orden_servicio os
      WHERE os.id_orden = checklist_item.id_orden
        AND os.id_tecnico = auth.uid()
        AND os.cerrada = false
    )
  );

-- 6.4 Técnico: actualización solo de sus propias órdenes abiertas
DROP POLICY IF EXISTS "Tecnico actualiza items de sus ordenes abiertas" ON checklist_item;
CREATE POLICY "Tecnico actualiza items de sus ordenes abiertas"
  ON checklist_item
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orden_servicio os
      WHERE os.id_orden = checklist_item.id_orden
        AND os.id_tecnico = auth.uid()
        AND os.cerrada = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orden_servicio os
      WHERE os.id_orden = checklist_item.id_orden
        AND os.id_tecnico = auth.uid()
        AND os.cerrada = false
    )
  );
