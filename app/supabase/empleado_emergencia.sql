-- ============================================================
-- CONTROL DICA-MX — Módulo Emergencia / Médico / Incapacidades
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Contactos de emergencia (máx. 2 por empleado)
create table if not exists public.empleado_emergencia (
  id           uuid primary key default uuid_generate_v4(),
  empleado_id  uuid not null references public.empleados(id) on delete cascade,
  orden        integer not null default 1 check (orden in (1, 2)),
  nombre       text not null,
  parentesco   text not null,
  telefono     text not null,
  telefono_alt text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (empleado_id, orden)
);

-- Condiciones médicas del empleado
create table if not exists public.empleado_medico (
  empleado_id         uuid primary key references public.empleados(id) on delete cascade,
  hipertension        boolean not null default false,
  diabetes            boolean not null default false,
  epilepsia           boolean not null default false,
  asma                boolean not null default false,
  cardiopatia         boolean not null default false,
  otras_condiciones   text,
  notas               text,
  updated_at          timestamptz not null default now()
);

-- Historial de incapacidades
create table if not exists public.empleado_incapacidades (
  id             uuid primary key default uuid_generate_v4(),
  empleado_id    uuid not null references public.empleados(id) on delete cascade,
  folio          text,
  tipo           text not null default 'imss'
                   check (tipo in ('imss', 'empresa', 'maternidad', 'paternidad', 'otro')),
  motivo         text not null,
  fecha_inicio   date not null,
  fecha_fin      date,
  dias_totales   integer,
  ruta_documento text,
  created_at     timestamptz not null default now()
);

-- Índices
create index if not exists idx_emp_emergencia   on public.empleado_emergencia(empleado_id);
create index if not exists idx_emp_incapacidades on public.empleado_incapacidades(empleado_id);

-- RLS
alter table public.empleado_emergencia    enable row level security;
alter table public.empleado_medico        enable row level security;
alter table public.empleado_incapacidades enable row level security;

drop policy if exists "emergencia_admin_all"    on public.empleado_emergencia;
drop policy if exists "medico_admin_all"         on public.empleado_medico;
drop policy if exists "incapacidades_admin_all"  on public.empleado_incapacidades;

create policy "emergencia_admin_all"   on public.empleado_emergencia    for all to authenticated using (public.get_user_role() in ('admin','superadmin'));
create policy "medico_admin_all"        on public.empleado_medico         for all to authenticated using (public.get_user_role() in ('admin','superadmin'));
create policy "incapacidades_admin_all" on public.empleado_incapacidades  for all to authenticated using (public.get_user_role() in ('admin','superadmin'));
