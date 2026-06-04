-- ============================================================
-- CONTROL DICA-MX — Inventario v2
-- Ejecutar después de inventario.sql
-- ============================================================

-- Renombrar fecha_compra → fecha_registro de forma segura
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventario_activos'
      AND column_name = 'fecha_compra'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventario_activos'
      AND column_name = 'fecha_registro'
  ) THEN
    ALTER TABLE public.inventario_activos RENAME COLUMN fecha_compra TO fecha_registro;
  END IF;
END $$;

-- Nuevas columnas
ALTER TABLE public.inventario_activos
  ADD COLUMN IF NOT EXISTS condicion            text DEFAULT 'bueno'
                             CHECK (condicion IN ('nuevo','bueno','regular','deteriorado','danado')),
  ADD COLUMN IF NOT EXISTS sistema_operativo    text,
  ADD COLUMN IF NOT EXISTS tipo_adquisicion     text DEFAULT 'propio'
                             CHECK (tipo_adquisicion IN ('propio','renta')),
  ADD COLUMN IF NOT EXISTS ubicacion_id         uuid REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS observaciones_fisicas text;

-- Tabla de log de activos
CREATE TABLE IF NOT EXISTS public.inventario_activo_log (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id  uuid        NOT NULL REFERENCES public.inventario_activos(id) ON DELETE CASCADE,
  usuario_id uuid        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  accion     text        NOT NULL,
  detalle    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_log_activo ON public.inventario_activo_log(activo_id);

-- Tabla de archivos (fotos y documentos)
CREATE TABLE IF NOT EXISTS public.inventario_activo_archivos (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id  uuid        NOT NULL REFERENCES public.inventario_activos(id) ON DELETE CASCADE,
  tipo       text        NOT NULL CHECK (tipo IN ('foto','documento')),
  nombre     text        NOT NULL,
  ruta       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_arch_activo ON public.inventario_activo_archivos(activo_id);

-- RLS
ALTER TABLE public.inventario_activo_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_activo_archivos  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_inv_log"  ON public.inventario_activo_log;
DROP POLICY IF EXISTS "admin_inv_arch" ON public.inventario_activo_archivos;

CREATE POLICY "admin_inv_log" ON public.inventario_activo_log
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','superadmin'))
  WITH CHECK (get_user_role() IN ('admin','superadmin'));

CREATE POLICY "admin_inv_arch" ON public.inventario_activo_archivos
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','superadmin'))
  WITH CHECK (get_user_role() IN ('admin','superadmin'));

-- Bucket de almacenamiento (20 MB, fotos + PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inventario-archivos','inventario-archivos', false, 20971520,
        ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "admin_inv_storage_up"  ON storage.objects;
DROP POLICY IF EXISTS "admin_inv_storage_sel" ON storage.objects;
DROP POLICY IF EXISTS "admin_inv_storage_del" ON storage.objects;

CREATE POLICY "admin_inv_storage_up" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventario-archivos' AND get_user_role() IN ('admin','superadmin'));

CREATE POLICY "admin_inv_storage_sel" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'inventario-archivos' AND get_user_role() IN ('admin','superadmin'));

CREATE POLICY "admin_inv_storage_del" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'inventario-archivos' AND get_user_role() IN ('admin','superadmin'));
