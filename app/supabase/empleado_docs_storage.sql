-- ============================================================
-- CONTROL DICA-MX — Documentos de empleados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Columnas extra en empleado_documentos
ALTER TABLE public.empleado_documentos
  ADD COLUMN IF NOT EXISTS numero_documento text,
  ADD COLUMN IF NOT EXISTS ruta_archivo     text;

-- Bucket privado para documentos de empleados (10 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'empleado-docs',
  'empleado-docs',
  false,
  10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage (solo admin/superadmin)
DROP POLICY IF EXISTS "admin_docs_upload"  ON storage.objects;
DROP POLICY IF EXISTS "admin_docs_select"  ON storage.objects;
DROP POLICY IF EXISTS "admin_docs_delete"  ON storage.objects;

CREATE POLICY "admin_docs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'empleado-docs' AND get_user_role() IN ('admin','superadmin'));

CREATE POLICY "admin_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'empleado-docs' AND get_user_role() IN ('admin','superadmin'));

CREATE POLICY "admin_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'empleado-docs' AND get_user_role() IN ('admin','superadmin'));
