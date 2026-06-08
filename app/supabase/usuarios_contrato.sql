-- ============================================================
-- CONTROL DICA-MX — Usuarios: asociación con contrato
-- Ejecutar después de contratos.sql
-- ============================================================

alter table public.usuarios
  add column if not exists contrato_id uuid
    references public.contratos(id) on delete set null;

create index if not exists idx_usuarios_contrato on public.usuarios(contrato_id);
