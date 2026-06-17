-- ============================================================
-- Migración: permitir borrar usuarios sin violar FK constraints
-- Cambia ON DELETE RESTRICT → ON DELETE SET NULL en tablas
-- que referencian public.usuarios(id)
-- ============================================================

-- audit_log.usuario_id
ALTER TABLE public.audit_log
  ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_usuario_id_fkey;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- archivos.subido_por
ALTER TABLE public.archivos
  ALTER COLUMN subido_por DROP NOT NULL;

ALTER TABLE public.archivos
  DROP CONSTRAINT IF EXISTS archivos_subido_por_fkey;

ALTER TABLE public.archivos
  ADD CONSTRAINT archivos_subido_por_fkey
  FOREIGN KEY (subido_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- solicitudes_eliminacion.solicitado_por
ALTER TABLE public.solicitudes_eliminacion
  ALTER COLUMN solicitado_por DROP NOT NULL;

ALTER TABLE public.solicitudes_eliminacion
  DROP CONSTRAINT IF EXISTS solicitudes_eliminacion_solicitado_por_fkey;

ALTER TABLE public.solicitudes_eliminacion
  ADD CONSTRAINT solicitudes_eliminacion_solicitado_por_fkey
  FOREIGN KEY (solicitado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- solicitudes_eliminacion.revisado_por (ya es nullable, aseguramos SET NULL)
ALTER TABLE public.solicitudes_eliminacion
  DROP CONSTRAINT IF EXISTS solicitudes_eliminacion_revisado_por_fkey;

ALTER TABLE public.solicitudes_eliminacion
  ADD CONSTRAINT solicitudes_eliminacion_revisado_por_fkey
  FOREIGN KEY (revisado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;
