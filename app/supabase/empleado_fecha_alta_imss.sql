-- ============================================================
-- CONTROL DICA-MX — Agregar fecha de alta IMSS
-- Ejecutar en Supabase SQL Editor
-- ============================================================

alter table public.empleado_datos_personales
  add column if not exists fecha_alta_imss date;
