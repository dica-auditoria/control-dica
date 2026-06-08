-- ============================================================
-- CONTROL DICA-MX — Schema v1.0  (idempotente — safe to re-run)
-- ISO/IEC 27001:2022 — A.5.9, A.5.15, A.5.31, A.8.10, A.8.15
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLAS
-- ============================================================

create table if not exists public.entidades (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null unique,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  entidad_id  uuid references public.entidades(id) on delete set null,
  rol         text not null check (rol in ('cliente', 'admin', 'superadmin', 'empleado', 'rrhh')),
  email       text not null unique,
  nombre      text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.archivos (
  id             uuid primary key default uuid_generate_v4(),
  entidad_id     uuid not null references public.entidades(id) on delete restrict,
  subido_por     uuid not null references public.usuarios(id) on delete restrict,
  nombre         text not null,
  ruta_storage   text not null,
  hash_sha256    text not null,
  size_bytes     bigint not null,
  tipo           text not null,
  estado         text not null default 'activo'
                   check (estado in ('activo', 'pendiente_eliminacion', 'eliminado')),
  created_at     timestamptz not null default now()
);

create table if not exists public.solicitudes_eliminacion (
  id             uuid primary key default uuid_generate_v4(),
  archivo_id     uuid not null references public.archivos(id) on delete cascade,
  solicitado_por uuid not null references public.usuarios(id) on delete restrict,
  motivo         text not null,
  estado         text not null default 'pendiente'
                   check (estado in ('pendiente', 'aprobado', 'rechazado')),
  revisado_por   uuid references public.usuarios(id) on delete set null,
  revisado_at    timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists public.audit_log (
  id           uuid primary key default uuid_generate_v4(),
  entidad_id   uuid references public.entidades(id) on delete set null,
  usuario_id   uuid not null references public.usuarios(id) on delete restrict,
  accion       text not null check (accion in (
                 'UPLOAD', 'REQUEST_DELETE', 'APPROVE_DELETE',
                 'REJECT_DELETE', 'USER_CREATE', 'USER_ROLE_UPDATE',
                 'USER_ENTITY_UPDATE', 'LOGIN', 'LOGOUT'
               )),
  recurso_id   uuid,
  detalle_json jsonb,
  ip           text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

create index if not exists idx_archivos_entidad    on public.archivos(entidad_id);
create index if not exists idx_archivos_estado     on public.archivos(estado);
create index if not exists idx_solicitudes_estado  on public.solicitudes_eliminacion(estado);
create index if not exists idx_audit_log_usuario   on public.audit_log(usuario_id);
create index if not exists idx_audit_log_entidad   on public.audit_log(entidad_id);
create index if not exists idx_audit_log_created   on public.audit_log(created_at desc);

-- ============================================================
-- RLS
-- ============================================================

alter table public.entidades               enable row level security;
alter table public.usuarios                enable row level security;
alter table public.archivos                enable row level security;
alter table public.solicitudes_eliminacion enable row level security;
alter table public.audit_log               enable row level security;

-- ============================================================
-- FUNCIONES HELPER
-- ============================================================

create or replace function public.get_user_role()
returns text language sql stable security definer as $$
  select rol from public.usuarios where id = auth.uid();
$$;

create or replace function public.get_user_entidad()
returns uuid language sql stable security definer as $$
  select entidad_id from public.usuarios where id = auth.uid();
$$;

-- ============================================================
-- RLS POLICIES — drop+create para idempotencia
-- ============================================================

-- entidades
drop policy if exists "admin_ver_entidades"          on public.entidades;
drop policy if exists "cliente_ver_su_entidad"       on public.entidades;
drop policy if exists "superadmin_gestionar_entidades" on public.entidades;

create policy "admin_ver_entidades" on public.entidades
  for select to authenticated
  using (get_user_role() in ('admin', 'superadmin', 'rrhh', 'empleado'));

create policy "cliente_ver_su_entidad" on public.entidades
  for select to authenticated
  using (id = get_user_entidad());

create policy "superadmin_gestionar_entidades" on public.entidades
  for all to authenticated
  using (get_user_role() = 'superadmin')
  with check (get_user_role() = 'superadmin');

-- usuarios
drop policy if exists "usuario_ver_propio"          on public.usuarios;
drop policy if exists "admin_ver_usuarios"           on public.usuarios;
drop policy if exists "superadmin_gestionar_usuarios" on public.usuarios;

create policy "usuario_ver_propio" on public.usuarios
  for select to authenticated
  using (id = auth.uid());

create policy "admin_ver_usuarios" on public.usuarios
  for select to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

create policy "superadmin_gestionar_usuarios" on public.usuarios
  for all to authenticated
  using (get_user_role() = 'superadmin')
  with check (get_user_role() = 'superadmin');

-- archivos
drop policy if exists "cliente_ver_archivos"   on public.archivos;
drop policy if exists "admin_ver_archivos"     on public.archivos;
drop policy if exists "usuario_subir_archivo"  on public.archivos;
drop policy if exists "admin_actualizar_archivo" on public.archivos;

create policy "cliente_ver_archivos" on public.archivos
  for select to authenticated
  using (entidad_id = get_user_entidad());

create policy "admin_ver_archivos" on public.archivos
  for select to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

create policy "usuario_subir_archivo" on public.archivos
  for insert to authenticated
  with check (entidad_id = get_user_entidad());

create policy "admin_actualizar_archivo" on public.archivos
  for update to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

-- solicitudes_eliminacion
drop policy if exists "cliente_ver_solicitudes"    on public.solicitudes_eliminacion;
drop policy if exists "admin_ver_solicitudes"      on public.solicitudes_eliminacion;
drop policy if exists "cliente_crear_solicitud"    on public.solicitudes_eliminacion;
drop policy if exists "admin_gestionar_solicitudes" on public.solicitudes_eliminacion;

create policy "cliente_ver_solicitudes" on public.solicitudes_eliminacion
  for select to authenticated
  using (
    exists (
      select 1 from public.archivos a
      where a.id = archivo_id and a.entidad_id = get_user_entidad()
    )
  );

create policy "admin_ver_solicitudes" on public.solicitudes_eliminacion
  for select to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

create policy "cliente_crear_solicitud" on public.solicitudes_eliminacion
  for insert to authenticated
  with check (
    solicitado_por = auth.uid()
    and exists (
      select 1 from public.archivos a
      where a.id = archivo_id and a.entidad_id = get_user_entidad()
    )
  );

create policy "admin_gestionar_solicitudes" on public.solicitudes_eliminacion
  for update to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

-- audit_log
drop policy if exists "audit_insert"        on public.audit_log;
drop policy if exists "admin_ver_audit_log" on public.audit_log;

create policy "audit_insert" on public.audit_log
  for insert to authenticated
  with check (usuario_id = auth.uid());

create policy "admin_ver_audit_log" on public.audit_log
  for select to authenticated
  using (get_user_role() in ('admin', 'superadmin'));

-- ============================================================
-- TRIGGER — perfil automático al registrarse
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios (id, email, nombre, rol, entidad_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'cliente'),
    (new.raw_user_meta_data->>'entidad_id')::uuid
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
