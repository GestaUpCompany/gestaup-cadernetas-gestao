ALTER TABLE public.registros_movimentacao 
ADD COLUMN lote_origem_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
ADD COLUMN lote_destino_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL;
