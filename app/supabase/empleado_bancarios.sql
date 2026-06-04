-- ============================================================
-- CONTROL DICA-MX — Datos bancarios de empleados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.empleado_bancarios (
  empleado_id    uuid PRIMARY KEY REFERENCES public.empleados(id) ON DELETE CASCADE,
  banco          text,
  tipo_cuenta    text DEFAULT 'nomina'
                   CHECK (tipo_cuenta IN ('nomina','cheques','debito','otro')),
  numero_cuenta  text,
  clabe          text,
  numero_tarjeta text,
  salario_texto  text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS bancarios_updated_at ON public.empleado_bancarios;
CREATE TRIGGER bancarios_updated_at
  BEFORE UPDATE ON public.empleado_bancarios
  FOR EACH ROW EXECUTE PROCEDURE public.set_empleado_updated_at();

ALTER TABLE public.empleado_bancarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_bancarios" ON public.empleado_bancarios;
CREATE POLICY "admin_bancarios" ON public.empleado_bancarios
  FOR ALL TO authenticated
  USING  (get_user_role() IN ('admin','superadmin'))
  WITH CHECK (get_user_role() IN ('admin','superadmin'));
