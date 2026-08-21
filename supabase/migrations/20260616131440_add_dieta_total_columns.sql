ALTER TABLE public.dietas
ADD COLUMN IF NOT EXISTS teor_ms_dieta numeric,
ADD COLUMN IF NOT EXISTS custo_ms_tonelada numeric,
ADD COLUMN IF NOT EXISTS consumo_ms_total numeric;;
