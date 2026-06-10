-- Fecha límite por reactivo y bandera de extensión
ALTER TABLE requerimiento_items
  ADD COLUMN IF NOT EXISTS fecha_limite DATE,
  ADD COLUMN IF NOT EXISTS extendida BOOLEAN NOT NULL DEFAULT false;

-- Poblar fecha_limite de ítems con la del requerimiento padre
UPDATE requerimiento_items ri
SET fecha_limite = r.fecha_limite
FROM requerimientos r
WHERE ri.requerimiento_id = r.id
  AND ri.fecha_limite IS NULL;
