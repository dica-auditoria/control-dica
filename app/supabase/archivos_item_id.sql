-- Vincular archivos a un reactivo (requerimiento_item) específico
ALTER TABLE public.archivos
  ADD COLUMN IF NOT EXISTS requerimiento_item_id UUID
    REFERENCES public.requerimiento_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_archivos_req_item ON public.archivos(requerimiento_item_id)
  WHERE requerimiento_item_id IS NOT NULL;
