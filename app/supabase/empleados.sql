-- ============================================================
-- CONTROL DICA-MX — Módulo Empleados (RRHH)
-- Ejecutar después de schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------

create table if not exists public.empleados (
  id                  uuid primary key default uuid_generate_v4(),
  nombres             text not null,
  apellido_paterno    text not null,
  apellido_materno    text not null,
  email_institucional text not null unique,
  email_local         text not null,
  puesto              text not null,
  departamento        text not null,
  supervisor_id       uuid references public.empleados(id) on delete set null,
  fecha_ingreso       date not null,
  tipo_contrato       text not null default 'indeterminado'
                        check (tipo_contrato in ('indeterminado', 'temporal', 'honorarios', 'practicas')),
  zona_ubicacion      text default 'oficina_principal',
  estado              text not null default 'pendiente'
                        check (estado in ('pendiente', 'activo', 'inactivo')),
  codigo_empleado     text unique,
  progreso_perfil     integer not null default 0 check (progreso_perfil >= 0 and progreso_perfil <= 100),
  usuario_id          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.empleado_datos_personales (
  empleado_id         uuid primary key references public.empleados(id) on delete cascade,
  fecha_nacimiento    date,
  curp                text,
  rfc                 text,
  nss                 text,
  estado_civil        text,
  nacionalidad        text default 'Mexicana',
  tipo_sangre         text,
  updated_at          timestamptz not null default now()
);

create table if not exists public.empleado_privacidad (
  id                  uuid primary key default uuid_generate_v4(),
  empleado_id         uuid not null references public.empleados(id) on delete cascade,
  version_aviso       text not null default '2024.06.01',
  acepta_aviso        boolean not null default false,
  acepta_sensibles    boolean not null default false,
  ip                  text,
  user_agent          text,
  created_at          timestamptz not null default now()
);

create table if not exists public.empleado_documentos (
  id                  uuid primary key default uuid_generate_v4(),
  empleado_id         uuid not null references public.empleados(id) on delete cascade,
  tipo                text not null,
  nombre              text not null,
  fecha_vencimiento   date,
  estado              text not null default 'pendiente'
                        check (estado in ('pendiente', 'vigente', 'por_vencer', 'vencido')),
  created_at          timestamptz not null default now()
);

create table if not exists public.empleado_bitacora (
  id                  uuid primary key default uuid_generate_v4(),
  empleado_id         uuid not null references public.empleados(id) on delete cascade,
  usuario_id          uuid references public.usuarios(id) on delete set null,
  accion              text not null,
  detalle_json        jsonb,
  created_at          timestamptz not null default now()
);

create table if not exists public.empleado_invitaciones (
  id                  uuid primary key default uuid_generate_v4(),
  empleado_id         uuid not null references public.empleados(id) on delete cascade,
  token               text not null unique,
  tipo                text not null default 'privacidad'
                        check (tipo in ('privacidad', 'completar_perfil')),
  expires_at          timestamptz not null,
  used_at             timestamptz,
  created_at          timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ÍNDICES
-- ------------------------------------------------------------

create index if not exists idx_empleados_estado       on public.empleados(estado);
create index if not exists idx_empleados_departamento on public.empleados(departamento);
create index if not exists idx_empleados_supervisor   on public.empleados(supervisor_id);
create index if not exists idx_empleado_docs_vence    on public.empleado_documentos(fecha_vencimiento);
create index if not exists idx_empleado_inv_token     on public.empleado_invitaciones(token);

-- ------------------------------------------------------------
-- TRIGGER updated_at
-- ------------------------------------------------------------

create or replace function public.set_empleado_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists empleados_updated_at on public.empleados;
create trigger empleados_updated_at
  before update on public.empleados
  for each row execute procedure public.set_empleado_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.empleados                enable row level security;
alter table public.empleado_datos_personales enable row level security;
alter table public.empleado_privacidad      enable row level security;
alter table public.empleado_documentos      enable row level security;
alter table public.empleado_bitacora        enable row level security;
alter table public.empleado_invitaciones    enable row level security;

drop policy if exists "admin_gestionar_empleados" on public.empleados;
drop policy if exists "admin_ver_empleados" on public.empleados;

create policy "admin_ver_empleados" on public.empleados
  for select to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

create policy "admin_gestionar_empleados" on public.empleados
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));

-- empleado_datos_personales
drop policy if exists "admin_empleado_datos" on public.empleado_datos_personales;
create policy "admin_empleado_datos" on public.empleado_datos_personales
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));

-- empleado_privacidad
drop policy if exists "admin_empleado_privacidad" on public.empleado_privacidad;
create policy "admin_empleado_privacidad" on public.empleado_privacidad
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));

-- empleado_documentos
drop policy if exists "admin_empleado_documentos" on public.empleado_documentos;
create policy "admin_empleado_documentos" on public.empleado_documentos
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));

-- empleado_bitacora
drop policy if exists "admin_empleado_bitacora" on public.empleado_bitacora;
create policy "admin_empleado_bitacora" on public.empleado_bitacora
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));

-- empleado_invitaciones (solo admin; portal usa RPC)
drop policy if exists "admin_empleado_invitaciones" on public.empleado_invitaciones;
create policy "admin_empleado_invitaciones" on public.empleado_invitaciones
  for all to authenticated
  using (get_user_role() in ('admin', 'superadmin'))
  with check (get_user_role() in ('admin', 'superadmin'));

-- ------------------------------------------------------------
-- RPC: validar invitación (lectura mínima para portal público)
-- ------------------------------------------------------------

create or replace function public.get_invitacion_empleado(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_emp record;
begin
  select i.* into v_inv
  from empleado_invitaciones i
  where i.token = p_token
    and i.used_at is null
    and i.expires_at > now();

  if not found then
    return jsonb_build_object('error', 'Invitación inválida o expirada');
  end if;

  select e.id, e.nombres, e.apellido_paterno, e.apellido_materno, e.email_institucional
  into v_emp
  from empleados e
  where e.id = v_inv.empleado_id;

  return jsonb_build_object(
    'empleado_id', v_emp.id,
    'nombre_completo', trim(v_emp.nombres || ' ' || v_emp.apellido_paterno || ' ' || v_emp.apellido_materno),
    'email', v_emp.email_institucional,
    'tipo_invitacion', v_inv.tipo
  );
end;
$$;

-- ------------------------------------------------------------
-- RPC: aceptar privacidad por token
-- ------------------------------------------------------------

create or replace function public.aceptar_privacidad_empleado(
  p_token        text,
  p_acepta_aviso boolean,
  p_acepta_sensibles boolean,
  p_ip           text default null,
  p_user_agent   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_privacidad_id uuid;
begin
  if not p_acepta_aviso then
    return jsonb_build_object('error', 'Debe aceptar el aviso de privacidad');
  end if;

  select * into v_inv
  from empleado_invitaciones
  where token = p_token
    and tipo = 'privacidad'
    and used_at is null
    and expires_at > now();

  if not found then
    return jsonb_build_object('error', 'Invitación inválida o expirada');
  end if;

  insert into empleado_privacidad (empleado_id, acepta_aviso, acepta_sensibles, ip, user_agent)
  values (v_inv.empleado_id, p_acepta_aviso, coalesce(p_acepta_sensibles, false), p_ip, p_user_agent)
  returning id into v_privacidad_id;

  update empleado_invitaciones set used_at = now() where id = v_inv.id;

  update empleados
  set estado = 'activo',
      progreso_perfil = greatest(progreso_perfil, 15)
  where id = v_inv.empleado_id;

  insert into empleado_bitacora (empleado_id, accion, detalle_json)
  values (
    v_inv.empleado_id,
    'PRIVACIDAD_ACEPTADA',
    jsonb_build_object('privacidad_id', v_privacidad_id::text)
  );

  return jsonb_build_object('success', true, 'empleado_id', v_inv.empleado_id);
end;
$$;

grant execute on function public.get_invitacion_empleado(text) to anon, authenticated;
grant execute on function public.aceptar_privacidad_empleado(text, boolean, boolean, text, text) to anon, authenticated;
