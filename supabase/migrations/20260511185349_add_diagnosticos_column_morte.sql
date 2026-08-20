ALTER TABLE public.registros_morte ADD COLUMN IF NOT EXISTS diagnosticos JSONB DEFAULT '{}';;
