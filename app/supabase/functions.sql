-- ============================================================
-- CONTROL DICA-MX — Funciones SECURITY DEFINER
-- Ejecutar después de schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- crear_solicitud_eliminacion
-- Usada por clientes: atomic update de archivo + insert solicitud + audit log
-- SECURITY DEFINER para saltear RLS de UPDATE en archivos
-- ------------------------------------------------------------
create or replace function public.crear_solicitud_eliminacion(
  p_archivo_id uuid,
  p_motivo     text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud_id uuid;
  v_entidad_id   uuid;
  v_usuario_id   uuid;
begin
  v_usuario_id := auth.uid();

  if v_usuario_id is null then
    raise exception 'No autenticado';
  end if;

  -- Verificar que el archivo pertenece a la entidad del usuario y está activo
  select entidad_id into v_entidad_id
  from archivos
  where id = p_archivo_id
    and entidad_id = get_user_entidad()
    and estado = 'activo';

  if not found then
    raise exception 'Archivo no encontrado, no autorizado o ya tiene una solicitud pendiente';
  end if;

  -- Marcar archivo como pendiente
  update archivos
  set estado = 'pendiente_eliminacion'
  where id = p_archivo_id;

  -- Crear solicitud
  insert into solicitudes_eliminacion (archivo_id, solicitado_por, motivo, estado)
  values (p_archivo_id, v_usuario_id, p_motivo, 'pendiente')
  returning id into v_solicitud_id;

  -- Audit log
  insert into audit_log (usuario_id, entidad_id, accion, recurso_id, detalle_json)
  values (
    v_usuario_id,
    v_entidad_id,
    'REQUEST_DELETE',
    p_archivo_id,
    jsonb_build_object('motivo', p_motivo, 'solicitud_id', v_solicitud_id::text)
  );

  return v_solicitud_id;
end;
$$;
