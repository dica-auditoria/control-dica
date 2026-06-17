-- ============================================================
-- CONTROL DICA-MX — Función para estadísticas del Directorio
-- Bypasea el límite de 1000 filas de PostgREST contando en DB
-- Ejecutar en Supabase SQL Editor
-- ============================================================

create or replace function public.get_directorio_stats()
returns table (
  entidad_id uuid,
  archivo_count bigint,
  usuario_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    e.id as entidad_id,
    count(distinct case when a.estado != 'eliminado' and a.tipo != 'carpeta' then a.id end) as archivo_count,
    count(distinct case when u.rol = 'cliente' then u.id end)
      + count(distinct ea.empleado_id) as usuario_count
  from entidades e
  left join archivos a on a.entidad_id = e.id
  left join usuarios u on u.entidad_id = e.id
  left join entidad_acceso_empleados ea on ea.entidad_id = e.id
  group by e.id
$$;

grant execute on function public.get_directorio_stats() to authenticated, service_role;
