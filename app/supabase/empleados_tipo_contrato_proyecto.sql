-- Agregar 'proyecto' al CHECK constraint de tipo_contrato en empleados
ALTER TABLE public.empleados
  DROP CONSTRAINT IF EXISTS empleados_tipo_contrato_check;

ALTER TABLE public.empleados
  ADD CONSTRAINT empleados_tipo_contrato_check
  CHECK (tipo_contrato IN ('indeterminado', 'temporal', 'honorarios', 'practicas', 'proyecto'));
