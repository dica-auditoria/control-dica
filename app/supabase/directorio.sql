-- ============================================================
-- CONTROL DICA-MX — Módulo Directorio de Direcciones
-- Ejecutar en Supabase SQL Editor después de schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ubicaciones (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo             text        NOT NULL CHECK (tipo IN ('oficina', 'zona_cliente')),
  nombre           text        NOT NULL,
  entidad_id       uuid        REFERENCES public.entidades(id) ON DELETE SET NULL,
  calle            text,
  numero_ext       text,
  numero_int       text,
  colonia          text,
  municipio        text,
  estado_dir       text,
  cp               text,
  pais             text        NOT NULL DEFAULT 'México',
  telefono         text,
  contacto_nombre  text,
  contacto_email   text,
  notas            text,
  activo           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_tipo    ON public.ubicaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_entidad ON public.ubicaciones(entidad_id);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_activo  ON public.ubicaciones(activo);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_ubicacion_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ubicaciones_updated_at ON public.ubicaciones;
CREATE TRIGGER ubicaciones_updated_at
  BEFORE UPDATE ON public.ubicaciones
  FOR EACH ROW EXECUTE PROCEDURE public.set_ubicacion_updated_at();

-- RLS
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver_ubicaciones" ON public.ubicaciones;
CREATE POLICY "ver_ubicaciones" ON public.ubicaciones
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'superadmin', 'cliente', 'empleado', 'rrhh'));

DROP POLICY IF EXISTS "admin_gestionar_ubicaciones" ON public.ubicaciones;
CREATE POLICY "admin_gestionar_ubicaciones" ON public.ubicaciones
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'superadmin'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin'));
