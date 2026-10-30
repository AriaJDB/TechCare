-- ============================================================================
-- TechCare - Migración Sprint 6 (HU5 - Checklist Interactivo Parte 2)
-- Archivo: supabase/migrations/20261021_04_checklist_sprint6_parte2.sql
-- Propósito: Ampliar checklist a las 6 tareas (puertos, temperatura, SMART),
--            campos de telemetría técnica y validaciones de cierre completo
-- ============================================================================

-- 1. Agregar columnas para mediciones técnicas detalladas en orden_servicio
ALTER TABLE orden_servicio 
  ADD COLUMN IF NOT EXISTS puertos_detalle jsonb DEFAULT '{"usb_a": "ok", "usb_c": "ok", "hdmi": "ok", "audio": "ok", "rj45": "ok", "observaciones": ""}'::jsonb,
  ADD COLUMN IF NOT EXISTS temperatura_detalle jsonb DEFAULT '{"temp_cpu_pre": null, "temp_gpu_pre": null, "temp_cpu_post": null, "temp_gpu_post": null, "delta_cpu": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS smart_detalle jsonb DEFAULT '{"salud_porcentaje": 100, "estado": "bueno", "horas_encendido": 0, "sectores_reasignados": 0, "temperatura": 35, "diagnostico": "Estado óptimo"}'::jsonb;

-- ----------------------------------------------------------------------------
-- 2. Actualizar Trigger para generar el Checklist COMPLETO (6 Tareas)
--    Cubre: limpieza, ventiladores, pasta_termica, puertos, temperatura, smart
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_fn_generar_checklist_completo()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO checklist_item (id_orden, tarea, obligatorio, completado)
  VALUES
    (NEW.id_orden, 'limpieza', true, false),
    (NEW.id_orden, 'ventiladores', true, false),
    (NEW.id_orden, 'pasta_termica', true, false),
    (NEW.id_orden, 'puertos', true, false),
    (NEW.id_orden, 'temperatura', true, false),
    (NEW.id_orden, 'smart', true, false)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generar_checklist_orden ON orden_servicio;
CREATE TRIGGER trg_generar_checklist_orden
  AFTER INSERT ON orden_servicio
  FOR EACH ROW
  EXECUTE FUNCTION tg_fn_generar_checklist_completo();

-- ----------------------------------------------------------------------------
-- 3. Trigger / Edge Pattern para Cierre de Orden (HU4/HU5, HU7, HU8, HU9)
--    Al cerrarse la orden (cerrada = true):
--    - Calcula proxima_fecha_mtto = fecha_cierre + (ciclo_meses || ' months')
--    - Actualiza estado_semaforo = 'verde' (al corriente tras mantenimiento)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_fn_procesar_cierre_orden()
RETURNS TRIGGER AS $$
DECLARE
  v_ciclo integer;
  v_fecha_cierre date;
BEGIN
  IF NEW.cerrada = true AND (OLD.cerrada IS DISTINCT FROM true) THEN
    -- Fijar fecha de cierre si no fue proporcionada
    IF NEW.fecha_cierre IS NULL THEN
      NEW.fecha_cierre := now();
    END IF;

    v_fecha_cierre := NEW.fecha_cierre::date;
    v_ciclo := COALESCE(NEW.ciclo_meses, 6);

    -- HU7: Cálculo automático de la próxima fecha de mantenimiento
    NEW.proxima_fecha_mtto := (v_fecha_cierre + (v_ciclo || ' months')::interval)::date;

    -- HU8: Semáforo verde inmediatamente después de completarse el servicio
    NEW.estado_semaforo := 'verde';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_procesar_cierre_orden ON orden_servicio;
CREATE TRIGGER trg_procesar_cierre_orden
  BEFORE UPDATE OF cerrada ON orden_servicio
  FOR EACH ROW
  EXECUTE FUNCTION tg_fn_procesar_cierre_orden();

-- ----------------------------------------------------------------------------
-- 4. Backfill: Insertar tareas faltantes de Sprint 6 en órdenes abiertas existentes
-- ----------------------------------------------------------------------------
INSERT INTO checklist_item (id_orden, tarea, obligatorio, completado)
SELECT os.id_orden, t.tarea, true, false
FROM orden_servicio os
CROSS JOIN (VALUES ('puertos'), ('temperatura'), ('smart')) AS t(tarea)
WHERE os.cerrada = false
  AND NOT EXISTS (
    SELECT 1 FROM checklist_item ci 
    WHERE ci.id_orden = os.id_orden AND ci.tarea = t.tarea
  );
