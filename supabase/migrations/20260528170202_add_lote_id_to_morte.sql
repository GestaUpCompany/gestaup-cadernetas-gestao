-- Add lote_id column to registros_morte
ALTER TABLE public.registros_morte 
ADD COLUMN lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL;;
