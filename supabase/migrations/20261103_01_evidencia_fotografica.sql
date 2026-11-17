-- ============================================================================
-- Migración Sprint 7: Módulo de Evidencias Fotográficas (HU6)
-- TechCare - Sistema Móvil de Gestión de Mantenimiento Preventivo
-- ============================================================================

-- 1. Crear tabla para registro de evidencias fotográficas
CREATE TABLE IF NOT EXISTS public.evidencia_fotografica (
    id_evidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.orden_servicio(id_orden) ON DELETE CASCADE,
    url_imagen TEXT NOT NULL,
    etapa TEXT NOT NULL CHECK (etapa IN ('antes', 'proceso', 'despues')),
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_orden_etapa UNIQUE (id_orden, etapa)
);

-- 2. Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_evidencia_id_orden ON public.evidencia_fotografica(id_orden);
CREATE INDEX IF NOT EXISTS idx_evidencia_etapa ON public.evidencia_fotografica(etapa);

-- 3. Habilitar RLS
ALTER TABLE public.evidencia_fotografica ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (RLS)
CREATE POLICY "Permitir lectura de evidencias a usuarios autenticados"
    ON public.evidencia_fotografica
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir insertar evidencias a técnicos autenticados"
    ON public.evidencia_fotografica
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir actualizar evidencias a técnicos autenticados"
    ON public.evidencia_fotografica
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Permitir eliminar evidencias a técnicos autenticados"
    ON public.evidencia_fotografica
    FOR DELETE
    TO authenticated
    USING (true);

-- 5. Bucket de almacenamiento en Supabase Storage (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias-servicio', 'evidencias-servicio', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para el bucket de evidencias
CREATE POLICY "Acceso público de lectura a evidencias fotográficas"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'evidencias-servicio');

CREATE POLICY "Permitir subida de evidencias a técnicos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'evidencias-servicio');

CREATE POLICY "Permitir eliminar evidencias del bucket"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'evidencias-servicio');
