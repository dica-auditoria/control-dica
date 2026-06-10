-- Agregar rubro y orden a requerimiento_items para soporte de plantilla CSV
ALTER TABLE public.requerimiento_items
  ADD COLUMN IF NOT EXISTS rubro TEXT,
  ADD COLUMN IF NOT EXISTS orden INTEGER;
