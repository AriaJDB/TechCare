-- ============================================================================
-- TechCare - Migración Sprint 5 (HU4)
-- Archivo: supabase/migrations/20261021_01_agregar_tarea_ventiladores.sql
-- Propósito: Agregar el valor 'ventiladores' al catálogo de tareas de checklist
-- ============================================================================

-- PASO 0: Diagnóstico del tipo real de la columna 'tarea'
-- Ejecutar en Supabase SQL Editor para verificar el tipo de dato subyacente:
/*
SELECT 
    column_name, 
    data_type, 
    udt_name 
FROM information_schema.columns 
WHERE table_name = 'checklist_item' 
  AND column_name = 'tarea';
*/

-- ============================================================================
-- CASO A: Si la columna 'tarea' utiliza un tipo ENUM de PostgreSQL
-- NOTA IMPORTANTE: En PostgreSQL, ALTER TYPE ... ADD VALUE no se puede ejecutar
-- dentro de una transacción de múltiples sentencias. Debe ejecutarse como una
-- sentencia aislada e independiente.
-- ============================================================================

ALTER TYPE tarea_checklist ADD VALUE IF NOT EXISTS 'ventiladores';

-- Nota: Si el tipo enum en tu base de datos fue nombrado diferente (ej. enum_checklist_item_tarea),
-- usa: ALTER TYPE enum_checklist_item_tarea ADD VALUE IF NOT EXISTS 'ventiladores';


-- ============================================================================
-- CASO B: Si la columna 'tarea' es de tipo TEXT / VARCHAR con restricción CHECK
-- (Si se usó una restricción CHECK en lugar de ENUM nativo, descomenta este bloque)
-- ============================================================================
/*
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Buscar restricción CHECK sobre la columna 'tarea'
  SELECT conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'checklist_item'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%tarea%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE checklist_item DROP CONSTRAINT ' || quote_ident(v_constraint_name);
  END IF;

  -- Recrear restricción con los 6 valores autorizados
  ALTER TABLE checklist_item ADD CONSTRAINT checklist_item_tarea_check 
    CHECK (tarea IN ('limpieza', 'ventiladores', 'pasta_termica', 'puertos', 'temperatura', 'smart'));
END $$;
*/
