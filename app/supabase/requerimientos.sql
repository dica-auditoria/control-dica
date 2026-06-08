-- ============================================================
-- CONTROL DICA-MX — Requerimientos de documentos con fecha límite
-- Ejecutar después de contratos.sql y archivos_contrato.sql
-- ============================================================

create table if not exists public.requerimientos (
  id            uuid primary key default uuid_generate_v4(),
  contrato_id   uuid references public.contratos(id) on delete cascade,
  entidad_id    uuid not null references public.entidades(id) on delete cascade,
  titulo        text not null,
  descripcion   text,
  fecha_limite  date not null,
  estado        text not null default 'pendiente'
                  check (estado in ('pendiente', 'en_revision', 'completado', 'vencido')),
  creado_por    uuid not null references public.usuarios(id),
  notas_cierre  text,
  created_at    timestamptz not null default now()
);

create table if not exists public.requerimiento_items (
  id                uuid primary key default uuid_generate_v4(),
  requerimiento_id  uuid not null references public.requerimientos(id) on delete cascade,
  nombre            text not null,
  descripcion       text,
  obligatorio       boolean not null default true,
  completado        boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Columna en archivos para vincular al requerimiento
alter table public.archivos
  add column if not exists requerimiento_id uuid references public.requerimientos(id) on delete set null;

create index if not exists idx_requerimientos_entidad  on public.requerimientos(entidad_id);
create index if not exists idx_requerimientos_contrato on public.requerimientos(contrato_id);
create index if not exists idx_requerimientos_estado   on public.requerimientos(estado);
create index if not exists idx_archivos_requerimiento  on public.archivos(requerimiento_id);

-- RLS: admin lee todo, cliente solo sus requerimientos
alter table public.requerimientos enable row level security;
alter table public.requerimiento_items enable row level security;

drop policy if exists "requerimientos_admin_all"   on public.requerimientos;
drop policy if exists "requerimientos_cliente_read" on public.requerimientos;
drop policy if exists "req_items_admin_all"         on public.requerimiento_items;
drop policy if exists "req_items_cliente_read"      on public.requerimiento_items;

create policy "requerimientos_admin_all" on public.requerimientos
  for all to authenticated
  using (public.get_user_role() in ('admin', 'superadmin'));

create policy "requerimientos_cliente_read" on public.requerimientos
  for select to authenticated
  using (
    public.get_user_role() = 'cliente'
    and entidad_id = public.get_user_entidad()
  );

create policy "req_items_admin_all" on public.requerimiento_items
  for all to authenticated
  using (
    exists (
      select 1 from public.requerimientos r
      where r.id = requerimiento_id
      and public.get_user_role() in ('admin', 'superadmin')
    )
  );

create policy "req_items_cliente_read" on public.requerimiento_items
  for select to authenticated
  using (
    exists (
      select 1 from public.requerimientos r
      where r.id = requerimiento_id
      and r.entidad_id = public.get_user_entidad()
    )
  );
