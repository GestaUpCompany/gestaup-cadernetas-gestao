-- ============================================================
-- Premix: flag e_premix em formulacoes + link de origem em insumos
-- Permite que uma formulação marcada como premix gere automaticamente
-- um insumo correspondente (com teor_ms e preco_ton_mn derivados),
-- para uso como ingrediente em outras formulações (TMR do vagão).
-- ============================================================

-- 1. Flag e_premix em formulacoes
--    true  = esta formulação é um premix (gera insumo para outras formulações)
--    false = esta formulação é uma TMR/dieta final (default, comportamento atual)
ALTER TABLE public.formulacoes
ADD COLUMN IF NOT EXISTS e_premix boolean NOT NULL DEFAULT false;

-- 2. Link de origem em insumos
--    Se não-null, este insumo é derivado automaticamente da formulação apontada.
--    Insumos gerados de premix são read-only em Insumos.tsx (edição redireciona
--    para a formulação de origem).
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
--    Partial index: só indexa insumos que são derivados de premix
CREATE INDEX IF NOT EXISTS idx_insumos_formulacao_origem_id
ON public.insumos (formulacao_origem_id)
WHERE formulacao_origem_id IS NOT NULL;

-- 4. Comentários para documentação
COMMENT ON COLUMN public.formulacoes.e_premix IS
  'true se esta formulação é um premix que gera um insumo para uso em outras formulações (TMR do vagão). Default false (TMR/dieta final).';
COMMENT ON COLUMN public.insumos.formulacao_origem_id IS
  'Se não-null, este insumo é derivado automaticamente da formulação apontada. Read-only em Insumos.tsx (edição redireciona para a formulação).';

-- 5. Backfill: todas as formulações existentes ficam e_premix = false (TMR)
--    Todas os insumos existentes ficam formulacao_origem_id = NULL (insumos atômicos)
--    O DEFAULT false no ALTER já cobre formulacoes; NULL no ALTER já cobre insumos.
--    Nada quebra: selects existentes não filtram por e_premix, e o default
--    faz com que todas as formulações atuais sejam tratadas como TMR.
