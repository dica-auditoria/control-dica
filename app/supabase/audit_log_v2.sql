-- Ampliar constraint del audit_log para incluir acciones de contratos y nuevos módulos
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_accion_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_accion_check
  CHECK (accion IN (
    -- Archivos
    'UPLOAD',
    'REQUEST_DELETE',
    'APPROVE_DELETE',
    'REJECT_DELETE',
    -- Contratos
    'CONTRATO_CREAR',
    'CONTRATO_ACTUALIZAR',
    'CONTRATO_ELIMINAR',
    -- Usuarios / Acceso
    'USER_CREATE',
    'USER_ROLE_UPDATE',
    'USER_ENTITY_UPDATE',
    -- Sesión
    'LOGIN',
    'LOGOUT',
    -- Empleados
    'EMPLEADO_CREAR',
    'EMPLEADO_ACTUALIZAR',
    -- Vacaciones / Otros
    'VACACION_APROBAR',
    'VACACION_RECHAZAR',
    'COMISION_CREAR',
    'PERMISO_APROBAR',
    'PERMISO_RECHAZAR',
    'PERMISO_VALIDAR_RH',
    -- Comunicados
    'COMUNICADO_CREAR',
    'COMUNICADO_ARCHIVAR'
  ));
