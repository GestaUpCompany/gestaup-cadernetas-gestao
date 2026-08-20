ALTER TABLE public.registros_enfermaria ADD COLUMN IF NOT EXISTS diagnosticos JSONB DEFAULT '{}'::jsonb;;
