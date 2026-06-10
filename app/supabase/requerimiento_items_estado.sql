-- Agrega campo estado al item de requerimiento
-- pendiente   = sin archivos subidos
-- en_revision = cliente subió archivos, empleado pendiente de revisar
-- completado  = empleado verificó y aprobó

ALTER TABLE requerimiento_items
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendiente'
  CHECK (estado IN ('pendiente', 'en_revision', 'completado'));

-- Migrar datos existentes
UPDATE requerimiento_items SET estado = 'completado' WHERE completado = true;
