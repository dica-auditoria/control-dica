-- ============================================================
-- CONTROL DICA-MX — Especificaciones de equipo de cómputo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.inventario_activos
  ADD COLUMN IF NOT EXISTS procesador    TEXT,
  ADD COLUMN IF NOT EXISTS ram           TEXT,
  ADD COLUMN IF NOT EXISTS almacenamiento TEXT,
  ADD COLUMN IF NOT EXISTS cargador      TEXT;
