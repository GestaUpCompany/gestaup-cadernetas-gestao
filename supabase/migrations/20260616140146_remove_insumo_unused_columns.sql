ALTER TABLE public.insumos
DROP COLUMN IF EXISTS marca,
DROP COLUMN IF EXISTS fabricante,
DROP COLUMN IF EXISTS espacamento_ideal_cocho,
DROP COLUMN IF EXISTS consumo_meta_porcentagem_pesovivo;;
