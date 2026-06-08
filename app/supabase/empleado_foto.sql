-- Agregar columna de foto de perfil al empleado
alter table public.empleados
  add column if not exists foto_url text;
