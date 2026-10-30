-- ============================================================================
-- TechCare - Migración Sprint 5 (HU4)
-- Archivo: supabase/migrations/20261021_03_backfill_ordenes_abiertas.sql
-- Propósito: Script opcional para incorporar 'ventiladores' en órdenes abiertas
-- ============================================================================

-- Inserta la tarea 'ventiladores' (obligatorio = true, completado = false)
-- ÚNICAMENTE en órdenes de servicio que sigan abiertas (cerrada = false)
-- y que aún no cuenten con dicha tarea en su checklist.

INSERT INTO checklist_item (id_orden, tarea, obligatorio, completado)
SELECT 
    os.id_orden, 
    'ventiladores'::tarea_checklist, 
    true, 
    false
FROM orden_servicio os
WHERE os.cerrada = false
  AND NOT EXISTS (
    SELECT 1 
    FROM checklist_item ci 
    WHERE ci.id_orden = os.id_orden 
      AND ci.tarea = 'ventiladores'
  );

-- Nota: Si tu base de datos usa tipo TEXT en lugar de ENUM, cambia
-- 'ventiladores'::tarea_checklist por simplemente 'ventiladores'.
