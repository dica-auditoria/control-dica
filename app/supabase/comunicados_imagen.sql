-- Agregar columna imagen a comunicados
ALTER TABLE public.comunicados ADD COLUMN IF NOT EXISTS imagen_url TEXT;
