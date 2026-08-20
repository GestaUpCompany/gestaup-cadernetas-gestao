ALTER TABLE public.lotes ADD COLUMN destino text CHECK (destino IN ('corte','reprodução','reproducao')); NOTIFY pgrst, 'reload schema';;
