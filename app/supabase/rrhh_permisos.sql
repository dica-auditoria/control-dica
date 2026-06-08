-- ============================================================
-- CONTROL DICA-MX — Permisos completos para rol rrhh
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- empleado_datos_personales
DROP POLICY IF EXISTS "admin_empleado_datos" ON public.empleado_datos_personales;
CREATE POLICY "admin_empleado_datos" ON public.empleado_datos_personales
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- empleado_privacidad
DROP POLICY IF EXISTS "admin_empleado_privacidad" ON public.empleado_privacidad;
CREATE POLICY "admin_empleado_privacidad" ON public.empleado_privacidad
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- empleado_documentos
DROP POLICY IF EXISTS "admin_empleado_documentos" ON public.empleado_documentos;
CREATE POLICY "admin_empleado_documentos" ON public.empleado_documentos
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- empleado_bitacora
DROP POLICY IF EXISTS "admin_empleado_bitacora" ON public.empleado_bitacora;
CREATE POLICY "admin_empleado_bitacora" ON public.empleado_bitacora
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- empleado_invitaciones
DROP POLICY IF EXISTS "admin_empleado_invitaciones" ON public.empleado_invitaciones;
CREATE POLICY "admin_empleado_invitaciones" ON public.empleado_invitaciones
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- Storage: bucket empleado-docs
DROP POLICY IF EXISTS "admin_docs_upload"  ON storage.objects;
DROP POLICY IF EXISTS "admin_docs_select"  ON storage.objects;
DROP POLICY IF EXISTS "admin_docs_delete"  ON storage.objects;

CREATE POLICY "admin_docs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'empleado-docs' AND get_user_role() IN ('admin', 'superadmin', 'rrhh'));

CREATE POLICY "admin_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'empleado-docs' AND get_user_role() IN ('admin', 'superadmin', 'rrhh'));

CREATE POLICY "admin_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'empleado-docs' AND get_user_role() IN ('admin', 'superadmin', 'rrhh'));
