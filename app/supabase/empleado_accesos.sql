-- Credentials vault for internal systems per employee
create table if not exists public.empleado_accesos (
  id          uuid primary key default uuid_generate_v4(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  sistema     text not null,
  usuario     text not null,
  contrasena  text,
  url         text,
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_empleado_accesos_emp on public.empleado_accesos(empleado_id);

create or replace function public.set_empleado_accesos_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists empleado_accesos_updated_at on public.empleado_accesos;
create trigger empleado_accesos_updated_at
  before update on public.empleado_accesos
  for each row execute procedure public.set_empleado_accesos_updated_at();

alter table public.empleado_accesos enable row level security;

drop policy if exists "admin_empleado_accesos" on public.empleado_accesos;
create policy "admin_empleado_accesos" on public.empleado_accesos
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));
