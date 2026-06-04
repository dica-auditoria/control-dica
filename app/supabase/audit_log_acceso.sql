-- ============================================================
-- CONTROL DICA-MX — Audit log para funciones sensibles de acceso
-- Ejecutar después de schema.sql
-- ============================================================

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_accion_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_accion_check
  CHECK (accion IN (
    'UPLOAD',
    'REQUEST_DELETE',
    'APPROVE_DELETE',
    'REJECT_DELETE',
    'USER_CREATE',
    'USER_ROLE_UPDATE',
    'USER_ENTITY_UPDATE',
    'LOGIN',
    'LOGOUT'
  ));
