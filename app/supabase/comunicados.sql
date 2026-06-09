-- ============================================================
-- CONTROL DICA-MX — Módulo Comunicados Internos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comunicados (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         TEXT NOT NULL,
  contenido      TEXT NOT NULL,
  tipo           TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info','urgente','recordatorio')),
  activo         BOOLEAN NOT NULL DEFAULT true,
  publicado_por  UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados leen comunicados activos
CREATE POLICY "comunicados_read" ON public.comunicados
  FOR SELECT TO authenticated
  USING (activo = true OR get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- Solo admin/rrhh crea, edita, elimina
CREATE POLICY "comunicados_admin_all" ON public.comunicados
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));
