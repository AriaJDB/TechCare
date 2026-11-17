-- =============================================================================
-- Migración Sprint 9 (HU9 e Integración): Causa Raíz, Fallas Recurrentes y Perfiles
-- Proyecto: TechCare — Sistema Móvil de Gestión de Mantenimiento Preventivo
-- =============================================================================

-- 1. Asegurar columnas de causa raíz y subsistema en orden_servicio
ALTER TABLE IF EXISTS public.orden_servicio
  ADD COLUMN IF NOT EXISTS subsistema_atendido text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS causa_raiz text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_intervencion text DEFAULT 'preventiva' CHECK (tipo_intervencion IN ('preventiva', 'correctiva'));

-- 2. Índice compuesto para acelerar la detección de fallas recurrentes (Sección 7.5 del Documento de Arquitectura)
CREATE INDEX IF NOT EXISTS idx_orden_servicio_equipo_subsistema
  ON public.orden_servicio (id_equipo, subsistema_atendido);

-- 3. Tabla de perfiles de usuario / ingenieros (Sección 7.3 USUARIO)
CREATE TABLE IF NOT EXISTS public.usuario (
  id_usuario uuid PRIMARY KEY,
  nombre text NOT NULL,
  correo text UNIQUE NOT NULL,
  rol text NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('tecnico', 'administrador')),
  especialidad text DEFAULT 'Soporte Técnico y Mantenimiento Preventivo',
  fecha_creacion timestamptz DEFAULT now()
);

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usuario' AND policyname = 'Usuarios autenticados gestionan perfiles'
  ) THEN
    CREATE POLICY "Usuarios autenticados gestionan perfiles"
      ON public.usuario
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Función RPC para la consulta clave de HU9 (Detección de 2+ fallas correctivas por subsistema)
-- Equivale exactamente a:
-- SELECT subsistema_atendido, COUNT(*) FROM orden_servicio
-- WHERE id_equipo = :id AND tipo_intervencion = 'correctiva'
-- GROUP BY subsistema_atendido HAVING COUNT(*) >= 2;
CREATE OR REPLACE FUNCTION public.detectar_fallas_recurrentes(p_id_equipo uuid)
RETURNS TABLE (
  subsistema_atendido text,
  total_incidencias bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT subsistema_atendido, COUNT(*) AS total_incidencias
  FROM public.orden_servicio
  WHERE id_equipo = p_id_equipo
    AND tipo_intervencion = 'correctiva'
  GROUP BY subsistema_atendido
  HAVING COUNT(*) >= 2;
$$;
