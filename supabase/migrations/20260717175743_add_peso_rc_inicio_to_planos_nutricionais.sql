ALTER TABLE public.planos_nutricionais
ADD COLUMN IF NOT EXISTS peso_inicio_kg_cab numeric(10,2),
ADD COLUMN IF NOT EXISTS rc_inicio numeric(5,2);;
