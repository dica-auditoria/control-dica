-- ============================================================
-- CONTROL DICA-MX — Aviso de privacidad para clientes
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Columna en usuarios para registrar la aceptación del aviso
alter table public.usuarios
  add column if not exists privacidad_aceptada_at timestamptz,
  add column if not exists privacidad_version      text,
  add column if not exists privacidad_ip           text;
