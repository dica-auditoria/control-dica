-- ============================================================
-- CONTROL DICA-MX — Inventario de activos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventario_categorias (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre     text NOT NULL UNIQUE,
  icono      text NOT NULL DEFAULT '📦',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventario_activos (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id   uuid REFERENCES public.inventario_categorias(id) ON DELETE SET NULL,
  nombre         text NOT NULL,
  marca          text,
  modelo         text,
  numero_serie   text,
  numero_activo  text UNIQUE,
  descripcion    text,
  fecha_compra   date,
  estado         text NOT NULL DEFAULT 'disponible'
                   CHECK (estado IN ('disponible','asignado','mantenimiento','baja')),
  notas          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventario_asignaciones (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id        uuid NOT NULL REFERENCES public.inventario_activos(id) ON DELETE CASCADE,
  empleado_id      uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_asignacion date NOT NULL DEFAULT CURRENT_DATE,
  fecha_devolucion date,
  activa           boolean NOT NULL DEFAULT true,
  notas            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activos_categoria ON public.inventario_activos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_activos_estado    ON public.inventario_activos(estado);
CREATE INDEX IF NOT EXISTS idx_asig_activo       ON public.inventario_asignaciones(activo_id);
CREATE INDEX IF NOT EXISTS idx_asig_empleado     ON public.inventario_asignaciones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_asig_activa       ON public.inventario_asignaciones(activa);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_activo_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS activos_updated_at ON public.inventario_activos;
CREATE TRIGGER activos_updated_at
  BEFORE UPDATE ON public.inventario_activos
  FOR EACH ROW EXECUTE PROCEDURE public.set_activo_updated_at();

-- RLS
ALTER TABLE public.inventario_categorias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_activos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_asignaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver_categorias"  ON public.inventario_categorias;
DROP POLICY IF EXISTS "admin_activos"   ON public.inventario_activos;
DROP POLICY IF EXISTS "admin_asig"      ON public.inventario_asignaciones;

CREATE POLICY "ver_categorias" ON public.inventario_categorias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_activos" ON public.inventario_activos
  FOR ALL TO authenticated
  USING  (get_user_role() IN ('admin','superadmin'))
  WITH CHECK (get_user_role() IN ('admin','superadmin'));

CREATE POLICY "admin_asig" ON public.inventario_asignaciones
  FOR ALL TO authenticated
  USING  (get_user_role() IN ('admin','superadmin'))
  WITH CHECK (get_user_role() IN ('admin','superadmin'));

-- Categorías predeterminadas
INSERT INTO public.inventario_categorias (nombre, icono) VALUES
  ('Equipo de cómputo',       '💻'),
  ('Monitor',                  '🖥'),
  ('Teclado',                  '⌨'),
  ('Mouse',                    '🖱'),
  ('Unidad de almacenamiento', '💾'),
  ('Periférico',               '📷'),
  ('Cable',                    '🔌'),
  ('Adaptador',                '🔧')
ON CONFLICT (nombre) DO NOTHING;
