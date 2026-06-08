-- ============================================================
-- CONTROL DICA-MX — Coordenadas + Asistencia
-- Ejecutar en Supabase SQL Editor después de directorio.sql
-- ============================================================

-- Agregar coordenadas y radio a ubicaciones
ALTER TABLE public.ubicaciones
  ADD COLUMN IF NOT EXISTS lat          DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS lng          DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS plus_code    TEXT,
  ADD COLUMN IF NOT EXISTS radio_metros INTEGER NOT NULL DEFAULT 50;

-- ------------------------------------------------------------
-- TABLA: empleado_asistencia
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empleado_asistencia (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empleado_id      uuid        NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  ubicacion_id     uuid        REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
  tipo             text        NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  lat              DECIMAL(10,8),
  lng              DECIMAL(11,8),
  distancia_metros NUMERIC(10,2),
  dentro_radio     BOOLEAN,
  notas            text,
  ip               text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asistencia_empleado ON public.empleado_asistencia(empleado_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha    ON public.empleado_asistencia(created_at);
CREATE INDEX IF NOT EXISTS idx_asistencia_tipo     ON public.empleado_asistencia(tipo);

-- RLS
ALTER TABLE public.empleado_asistencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_ver_asistencia"        ON public.empleado_asistencia;
DROP POLICY IF EXISTS "admin_gestionar_asistencia"  ON public.empleado_asistencia;
DROP POLICY IF EXISTS "empleado_insertar_asistencia" ON public.empleado_asistencia;

CREATE POLICY "admin_ver_asistencia" ON public.empleado_asistencia
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

CREATE POLICY "admin_gestionar_asistencia" ON public.empleado_asistencia
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'superadmin', 'rrhh'))
  WITH CHECK (get_user_role() IN ('admin', 'superadmin', 'rrhh'));

-- Employees can insert their own attendance records
CREATE POLICY "empleado_insertar_asistencia" ON public.empleado_asistencia
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE id = empleado_id
      AND email_institucional = auth.email()
    )
  );
