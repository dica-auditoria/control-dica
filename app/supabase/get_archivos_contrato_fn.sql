-- ============================================================
-- CONTROL DICA-MX — Función para obtener archivos de un contrato
-- Bypasea el límite de 1000 filas de PostgREST
-- Ejecutar en Supabase SQL Editor
-- ============================================================

create or replace function public.get_archivos_contrato(p_contrato_id uuid)
returns table (
  id            uuid,
  nombre        text,
  ruta_storage  text,
  tipo          text,
  estado        text,
  size_bytes    bigint,
  hash_sha256   text,
  created_at    timestamptz,
  destino       text,
  requerimiento_item_id uuid,
  subido_por_nombre text
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.nombre,
    a.ruta_storage,
    a.tipo,
    a.estado,
    a.size_bytes,
    a.hash_sha256,
    a.created_at,
    a.destino,
    a.requerimiento_item_id,
    u.nombre as subido_por_nombre
  from archivos a
  left join usuarios u on u.id = a.subido_por
  where a.contrato_id = p_contrato_id
    and a.estado != 'eliminado'
  order by a.created_at desc
$$;

grant execute on function public.get_archivos_contrato(uuid) to authenticated, service_role;
