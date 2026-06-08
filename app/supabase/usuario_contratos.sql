-- ============================================================
-- CONTROL DICA-MX — Relación usuario ↔ contratos (muchos a muchos)
-- Ejecutar después de contratos.sql y usuarios_contrato.sql
-- ============================================================

create table if not exists public.usuario_contratos (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint usuario_contratos_unique unique (usuario_id, contrato_id)
);

create index if not exists idx_uc_usuario  on public.usuario_contratos(usuario_id);
create index if not exists idx_uc_contrato on public.usuario_contratos(contrato_id);

alter table public.usuario_contratos enable row level security;

drop policy if exists "admin_ver_usuario_contratos"       on public.usuario_contratos;
drop policy if exists "admin_gestionar_usuario_contratos" on public.usuario_contratos;
drop policy if exists "cliente_ver_sus_contratos"         on public.usuario_contratos;

create policy "admin_ver_usuario_contratos" on public.usuario_contratos
  for select to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

create policy "admin_gestionar_usuario_contratos" on public.usuario_contratos
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));

create policy "cliente_ver_sus_contratos" on public.usuario_contratos
  for select to authenticated
  using (usuario_id = auth.uid());
