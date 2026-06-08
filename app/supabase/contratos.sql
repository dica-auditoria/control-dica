-- ============================================================
-- CONTROL DICA-MX — Módulo Contratos
-- Ejecutar después de schema.sql
-- ============================================================

create table if not exists public.contratos (
  id                uuid primary key default uuid_generate_v4(),
  entidad_id        uuid not null references public.entidades(id) on delete cascade,
  nombre            text not null,
  numero_contrato   text,
  fecha_inicio      date not null,
  fecha_fin         date,
  estado            text not null default 'vigente'
                      check (estado in ('vigente', 'vencido', 'cancelado')),
  -- Dirección de servicio
  calle             text,
  numero_exterior   text,
  numero_interior   text,
  colonia           text,
  municipio         text,
  estado_republica  text,
  cp                text,
  referencias       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------

create index if not exists idx_contratos_entidad on public.contratos(entidad_id);
create index if not exists idx_contratos_estado  on public.contratos(estado);

-- ------------------------------------------------------------
-- Trigger updated_at
-- ------------------------------------------------------------

create or replace function public.set_contrato_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contratos_updated_at on public.contratos;
create trigger contratos_updated_at
  before update on public.contratos
  for each row execute procedure public.set_contrato_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.contratos enable row level security;

drop policy if exists "admin_ver_contratos"        on public.contratos;
drop policy if exists "admin_gestionar_contratos"  on public.contratos;

create policy "admin_ver_contratos" on public.contratos
  for select to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

create policy "admin_gestionar_contratos" on public.contratos
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));
