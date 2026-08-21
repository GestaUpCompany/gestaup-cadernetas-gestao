-- 1. Flag e_premix em formulacoes
ALTER TABLE public.formulacoes
ADD COLUMN IF NOT EXISTS e_premix boolean NOT NULL DEFAULT false;

-- 2. Link de origem em insumos
ALTER TABLE public.insumos
ADD COLUMN IF NOT EXISTS formulacao_origem_id uuid;

ALTER TABLE public.insumos
DROP CONSTRAINT IF EXISTS insumos_formulacao_origem_id_fkey;

ALTER TABLE public.insumos
ADD CONSTRAINT insumos_formulacao_origem_id_fkey
FOREIGN KEY (formulacao_origem_id)
REFERENCES public.formulacoes(id)
ON DELETE SET NULL;

-- 3. Índice para buscar insumo gerado de uma formulação
CREATE INDEX IF NOT EXISTS idx_insumos_formulacao_origem_id
ON public.insumos (formulacao_origem_id)
WHERE formulacao_origem_id IS NOT NULL;

-- 4. Comentários para documentação
COMMENT ON COLUMN public.formulacoes.e_premix IS
  'true se esta formulação é um premix que gera um insumo para uso em outras formulações (TMR do vagão). Default false (TMR/dieta final).';
COMMENT ON COLUMN public.insumos.formulacao_origem_id IS
  'Se não-null, este insumo é derivado automaticamente da formulação apontada. Read-only em Insumos.tsx (edição redireciona para a formulação).';;
