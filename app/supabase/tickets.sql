-- Tabla de tickets de soporte interno
create table if not exists public.tickets (
  id            uuid        primary key default gen_random_uuid(),
  usuario_id    uuid        references public.usuarios(id) on delete set null,
  tipo          text        not null check (tipo in ('computadora', 'plataforma', 'sugerencia', 'otro')),
  titulo        text        not null,
  descripcion   text        not null,
  estado        text        not null default 'abierto' check (estado in ('abierto', 'en_proceso', 'resuelto')),
  prioridad     text        not null default 'media' check (prioridad in ('baja', 'media', 'alta')),
  respuesta     text,
  resuelto_por  uuid        references public.usuarios(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.tickets enable row level security;

-- Usuarios ven solo sus propios tickets; admins/superadmin/rrhh ven todos
create policy "tickets_select" on public.tickets
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or get_user_role() in ('admin', 'superadmin', 'rrhh')
  );

-- Cualquier autenticado puede crear tickets propios
create policy "tickets_insert" on public.tickets
  for insert to authenticated
  with check (usuario_id = auth.uid());

-- Solo admins pueden actualizar (responder, cambiar estado/prioridad)
create policy "tickets_update" on public.tickets
  for update to authenticated
  using (get_user_role() in ('admin', 'superadmin'));
