ALTER TABLE public.dietas
ADD COLUMN IF NOT EXISTS sistema_producao text;

ALTER TABLE public.dietas
ADD CONSTRAINT dietas_sistema_producao_check
CHECK (sistema_producao IS NULL OR sistema_producao = ANY (ARRAY['Cria','Recria','Engorda']));;
