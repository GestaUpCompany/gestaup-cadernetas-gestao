ALTER TABLE public.registros_morte 
ADD COLUMN IF NOT EXISTS lote_id uuid,
ADD COLUMN IF NOT EXISTS pasto_id uuid;

ALTER TABLE public.registros_morte
DROP CONSTRAINT IF EXISTS registros_morte_lote_id_fkey,
ADD CONSTRAINT registros_morte_lote_id_fkey 
  FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE SET NULL;

ALTER TABLE public.registros_morte
DROP CONSTRAINT IF EXISTS registros_morte_pasto_id_fkey,
ADD CONSTRAINT registros_morte_pasto_id_fkey 
  FOREIGN KEY (pasto_id) REFERENCES public.pastos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_registros_morte_lote_id 
  ON public.registros_morte(lote_id);

CREATE INDEX IF NOT EXISTS idx_registros_morte_pasto_id 
  ON public.registros_morte(pasto_id);;
