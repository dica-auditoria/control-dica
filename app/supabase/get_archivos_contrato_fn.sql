-- ============================================================
-- CONTROL DICA-MX — Función para obtener archivos de un contrato
-- Retorna jsonb (un solo valor) para bypassear el max_rows de PostgREST
-- Ejecutar en Supabase SQL Editor
-- ============================================================

create or replace function public.get_archivos_contrato(p_contrato_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',                     a.id,
        'nombre',                 a.nombre,
        'ruta_storage',           a.ruta_storage,
        'tipo',                   a.tipo,
        'estado',                 a.estado,
        'size_bytes',             a.size_bytes,
        'hash_sha256',            a.hash_sha256,
        'created_at',             a.created_at,
        'destino',                a.destino,
        'requerimiento_item_id',  a.requerimiento_item_id,
        'subido_por_nombre',      u.nombre
      )
    ),
    '[]'::jsonb
  )
  from archivos a
  left join usuarios u on u.id = a.subido_por
  where a.contrato_id = p_contrato_id
    and a.estado is distinct from 'eliminado'
$$;

grant execute on function public.get_archivos_contrato(uuid) to authenticated, service_role;
