-- Add schedule fields for practicas employees
alter table public.empleados
  add column if not exists hora_entrada       time,
  add column if not exists hora_salida        time,
  add column if not exists tolerancia_minutos integer default 10;
