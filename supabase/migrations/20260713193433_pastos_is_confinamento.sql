ALTER TABLE public.pastos
ADD COLUMN IF NOT EXISTS is_confinamento BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pastos.is_confinamento IS 'Indica se o pasto é de confinamento (true) ou pasto normal (false)';;
