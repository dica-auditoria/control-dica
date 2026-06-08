-- ============================================================
-- CONTROL DICA-MX — Usuarios: campo activo
-- ============================================================

alter table public.usuarios
  add column if not exists activo boolean not null default true;
