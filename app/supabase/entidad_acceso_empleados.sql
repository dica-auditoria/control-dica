-- Tabla de acceso de empleados a directorios de empresas
CREATE TABLE IF NOT EXISTS public.entidad_acceso_empleados (
  entidad_id   UUID NOT NULL REFERENCES public.entidades(id)  ON DELETE CASCADE,
  empleado_id  UUID NOT NULL REFERENCES public.empleados(id)  ON DELETE CASCADE,
  otorgado_por UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad_id, empleado_id)
);

ALTER TABLE public.entidad_acceso_empleados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read entidad_acceso_empleados"
  ON public.entidad_acceso_empleados FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage entidad_acceso_empleados"
  ON public.entidad_acceso_empleados FOR ALL
  TO authenticated
  USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid())
    IN ('admin', 'superadmin', 'rrhh')
  );
