ALTER TABLE public.registros_pastagens ADD COLUMN IF NOT EXISTS pasto_saida_area_util text;
ALTER TABLE public.registros_pastagens ADD COLUMN IF NOT EXISTS pasto_saida_especie text;
ALTER TABLE public.registros_pastagens ADD COLUMN IF NOT EXISTS pasto_entrada_area_util text;
ALTER TABLE public.registros_pastagens ADD COLUMN IF NOT EXISTS pasto_entrada_especie text;;
