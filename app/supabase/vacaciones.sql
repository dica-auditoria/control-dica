-- ============================================================
-- CONTROL DICA-MX — Módulo Vacaciones y Permisos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.solicitudes_vacaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id     UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('vacaciones','permiso_con_goce','permiso_sin_goce')),
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE NOT NULL,
  dias_habiles    INTEGER NOT NULL DEFAULT 1,
  motivo          TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado','cancelado')),
  comentario_rrhh TEXT,
  aprobado_por    UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitudes_vacaciones ENABLE ROW LEVEL SECURITY;

-- Empleado ve sus propias solicitudes
CREATE POLICY "vacaciones_empleado_select" ON public.solicitudes_vacaciones
  FOR SELECT TO authenticated
  USING (
    empleado_id IN (
      SELECT id FROM public.empleados WHERE email_institucional = auth.email()
    )
  );

-- Empleado puede crear y cancelar sus propias
CREATE POLICY "vacaciones_empleado_insert" ON public.solicitudes_vacaciones
  FOR INSERT TO authenticated
  WITH CHECK (
    empleado_id IN (
      SELECT id FROM public.empleados WHERE email_institucional = auth.email()
    )
  );

CREATE POLICY "vacaciones_empleado_cancelar" ON public.solicitudes_vacaciones
  FOR UPDATE TO authenticated
  USING (
    empleado_id IN (
      SELECT id FROM public.empleados WHERE email_institucional = auth.email()
    ) AND estado = 'pendiente'
  )
  WITH CHECK (estado = 'cancelado');

-- Admin/RRHH gestiona todas
CREATE POLICY "vacaciones_admin_all" ON public.solicitudes_vacaciones
  FOR ALL TO authenticated
  USING    (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));
