ALTER TABLE public.registros_pastagens
ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes(id);;
