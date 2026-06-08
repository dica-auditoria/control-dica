-- ============================================================
-- CONTROL DICA-MX — Archivos: campo destino (cliente / empleado)
-- ============================================================

alter table public.archivos
  add column if not exists destino text not null default 'cliente'
    check (destino in ('cliente', 'empleado'));

create index if not exists idx_archivos_destino on public.archivos(destino);
