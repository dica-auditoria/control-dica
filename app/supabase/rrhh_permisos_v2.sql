-- ============================================================
-- CONTROL DICA-MX — Permisos rrhh (v2): tablas faltantes
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- empleado_bancarios
DROP POLICY IF EXISTS "admin_bancarios" ON public.empleado_bancarios;
CREATE POLICY "admin_bancarios" ON public.empleado_bancarios
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- empleado_emergencia
DROP POLICY IF EXISTS "emergencia_admin_all" ON public.empleado_emergencia;
CREATE POLICY "emergencia_admin_all" ON public.empleado_emergencia
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- empleado_medico
DROP POLICY IF EXISTS "medico_admin_all" ON public.empleado_medico;
CREATE POLICY "medico_admin_all" ON public.empleado_medico
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- empleado_incapacidades
DROP POLICY IF EXISTS "incapacidades_admin_all" ON public.empleado_incapacidades;
CREATE POLICY "incapacidades_admin_all" ON public.empleado_incapacidades
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- empleado_accesos (credenciales de sistemas internos)
DROP POLICY IF EXISTS "admin_empleado_accesos" ON public.empleado_accesos;
CREATE POLICY "admin_empleado_accesos" ON public.empleado_accesos
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));
