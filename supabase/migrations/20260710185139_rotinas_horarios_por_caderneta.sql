ALTER TABLE public.rotinas
DROP COLUMN IF EXISTS horario,
ADD COLUMN horarios JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.rotinas.horarios IS 'Horários opcionais por caderneta no formato { caderneta_slug: HH:MM:SS }';;
