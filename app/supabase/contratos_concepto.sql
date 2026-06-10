-- Agregar campo concepto a contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS concepto TEXT;
