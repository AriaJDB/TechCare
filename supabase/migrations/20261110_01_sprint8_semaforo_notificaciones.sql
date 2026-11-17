-- =============================================================================
-- Migración Sprint 8 (HU7 y HU8): Programación automática, Semáforo y Notificaciones
-- Proyecto: TechCare — Sistema Móvil de Gestión de Mantenimiento Preventivo
-- =============================================================================

-- 1. Asegurar columnas de programación y semáforo en orden_servicio
ALTER TABLE IF EXISTS public.orden_servicio
  ADD COLUMN IF NOT EXISTS ciclo_meses integer DEFAULT 6 CHECK (ciclo_meses IN (3, 6, 12)),
  ADD COLUMN IF NOT EXISTS proxima_fecha_mtto date,
  ADD COLUMN IF NOT EXISTS estado_semaforo text DEFAULT 'verde' CHECK (estado_semaforo IN ('verde', 'amarillo', 'rojo')),
  ADD COLUMN IF NOT EXISTS nombre_tecnico text;

-- 2. Índice sobre proxima_fecha_mtto para acelerar el cálculo diario de semáforo (Sección 7.5)
CREATE INDEX IF NOT EXISTS idx_orden_servicio_proxima_fecha_mtto
  ON public.orden_servicio (proxima_fecha_mtto);

-- 3. Tabla de bitácora de notificaciones de vencimiento enviadas a los ingenieros
CREATE TABLE IF NOT EXISTS public.notificacion_vencimiento (
  id_notificacion uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_equipo uuid REFERENCES public.equipo(id) ON DELETE CASCADE,
  id_orden uuid REFERENCES public.orden_servicio(id_orden) ON DELETE SET NULL,
  ingeniero_destinatario text NOT NULL,
  estado_semaforo text NOT NULL CHECK (estado_semaforo IN ('amarillo', 'rojo')),
  proxima_fecha_mtto date NOT NULL,
  mensaje text NOT NULL,
  leida boolean DEFAULT false,
  fecha_envio timestamptz DEFAULT now()
);

ALTER TABLE public.notificacion_vencimiento ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notificacion_vencimiento' AND policyname = 'Usuarios autenticados leen y registran notificaciones'
  ) THEN
    CREATE POLICY "Usuarios autenticados leen y registran notificaciones"
      ON public.notificacion_vencimiento
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Función automatizada para recalcular estado_semaforo según proxima_fecha_mtto (pg_cron / Trigger)
CREATE OR REPLACE FUNCTION public.recalcular_semaforo_ordenes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.orden_servicio
  SET estado_semaforo = CASE
    WHEN proxima_fecha_mtto < CURRENT_DATE THEN 'rojo'
    WHEN (proxima_fecha_mtto - CURRENT_DATE) <= 15 THEN 'amarillo'
    ELSE 'verde'
  END
  WHERE cerrada = true AND proxima_fecha_mtto IS NOT NULL;
END;
$$;

