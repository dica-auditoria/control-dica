-- Add 'rrhh' role for HR management (Recursos Humanos)
-- Can manage employees and attendance; cannot access clients, files, or contracts
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('cliente', 'admin', 'superadmin', 'empleado', 'rrhh'));
