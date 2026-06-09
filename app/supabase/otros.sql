-- Módulo Otros: Comisiones y Permisos
CREATE TABLE IF NOT EXISTS public.solicitudes_otros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('comision', 'permiso')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT NOT NULL,
  -- comision: pendiente_rh -> aprobado_rh | rechazado_rh
  -- permiso:  pendiente_supervisor -> aprobado_supervisor -> pendiente_rh -> aprobado_rh | rechazado_rh
  estado TEXT NOT NULL DEFAULT 'pendiente_supervisor'
    CHECK (estado IN ('pendiente_supervisor','aprobado_supervisor','rechazado_supervisor','pendiente_rh','aprobado_rh','rechazado_rh','cancelado')),
  creado_por UUID REFERENCES auth.users(id),
  supervisor_empleado_id UUID REFERENCES public.empleados(id),
  comentario_supervisor TEXT,
  fecha_decision_supervisor TIMESTAMPTZ,
  comentario_rh TEXT,
  fecha_decision_rh TIMESTAMPTZ,
  aprobado_rh_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitudes_otros ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer (control en server actions)
CREATE POLICY "autenticados_ver_otros" ON public.solicitudes_otros
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados_insertar_otros" ON public.solicitudes_otros
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "autenticados_actualizar_otros" ON public.solicitudes_otros
  FOR UPDATE USING (auth.role() = 'authenticated');
