-- Remove FK e coluna dieta_id (criada anteriormente apenas para confinamento)
ALTER TABLE public.currais
DROP CONSTRAINT IF EXISTS currais_dieta_id_fkey;

ALTER TABLE public.currais
DROP COLUMN IF EXISTS dieta_id;

-- Adiciona FK para formulações
ALTER TABLE public.currais
ADD COLUMN IF NOT EXISTS formulacao_id UUID REFERENCES public.formulacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_currais_formulacao ON public.currais(formulacao_id);

COMMENT ON COLUMN public.currais.formulacao_id IS 'Formulação/dieta atual aplicada no curral';;
