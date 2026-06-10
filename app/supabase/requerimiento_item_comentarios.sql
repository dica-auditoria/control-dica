CREATE TABLE IF NOT EXISTS public.requerimiento_item_comentarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        UUID NOT NULL REFERENCES public.requerimiento_items(id) ON DELETE CASCADE,
  usuario_id     UUID NOT NULL REFERENCES auth.users(id),
  usuario_nombre TEXT NOT NULL,
  mensaje        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_item ON public.requerimiento_item_comentarios(item_id, created_at);

ALTER TABLE public.requerimiento_item_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comentarios_read" ON public.requerimiento_item_comentarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "comentarios_insert" ON public.requerimiento_item_comentarios
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);
