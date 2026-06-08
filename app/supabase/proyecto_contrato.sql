-- ============================================================
-- CONTROL DICA-MX — Tipo de contrato: Proyecto
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS fecha_inicio_proyecto DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin_proyecto    DATE;
