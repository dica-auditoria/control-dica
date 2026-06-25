-- Agrega "parcial" al CHECK constraint de requerimiento_items.estado
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar el constraint actual (el nombre puede variar, ambas líneas cubren variantes comunes)
ALTER TABLE public.requerimiento_items DROP CONSTRAINT IF EXISTS requerimiento_items_estado_check;
ALTER TABLE public.requerimiento_items DROP CONSTRAINT IF EXISTS requerimiento_items_estado_check1;

-- 2. Agregar el nuevo constraint con "parcial" incluido
ALTER TABLE public.requerimiento_items
  ADD CONSTRAINT requerimiento_items_estado_check
  CHECK (estado IN ('pendiente', 'en_revision', 'parcial', 'completado'));
