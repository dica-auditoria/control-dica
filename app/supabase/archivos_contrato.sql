-- ============================================================
-- CONTROL DICA-MX — Archivos por contrato
-- Ejecutar después de contratos.sql
-- ============================================================

alter table public.archivos
  add column if not exists contrato_id uuid
    references public.contratos(id) on delete set null;

create index if not exists idx_archivos_contrato on public.archivos(contrato_id);
