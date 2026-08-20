-- Add lote_id column to registros_maternidade
ALTER TABLE public.registros_maternidade 
ADD COLUMN lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL;;
