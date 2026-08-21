-- ============================================================================
-- MIGRATION A — lotes.formulacao_id (FK da fila de formulações, índice [0])
-- ============================================================================
-- Objetivo: adicionar coluna formulacao_id em lotes para receber a primeira
-- formulação da fila (índice [0]). Na nova arquitetura, a formulação é
-- atrelada ao lote, não mais à categoria.
--
-- Backfill: para cada lote ativo, setar formulacao_id com a formulação do
-- plano vigente mais antigo (menor data_inicio). Lotes com categorias e
-- planos vigentes de formulações diferentes serão normalizados na Migration H.
-- ============================================================================

-- 1. Adicionar coluna
ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS formulacao_id uuid;

-- 2. FK com ON DELETE SET NULL (não quebra se formulação for excluída)
ALTER TABLE public.lotes
  DROP CONSTRAINT IF EXISTS lotes_formulacao_id_fkey;

ALTER TABLE public.lotes
  ADD CONSTRAINT lotes_formulacao_id_fkey
  FOREIGN KEY (formulacao_id)
  REFERENCES public.formulacoes(id)
  ON DELETE SET NULL;

-- 3. Índice para buscas reversas (quais lotes usam esta formulação)
CREATE INDEX IF NOT EXISTS idx_lotes_formulacao_id
  ON public.lotes(formulacao_id)
  WHERE formulacao_id IS NOT NULL;

-- 4. Backfill: para cada lote ativo, pegar a formulação do plano vigente
--    mais antigo. Usa DISTINCT ON para pegar um plano por lote (menor data_inicio).
UPDATE public.lotes l
SET formulacao_id = sub.formulacao_id
FROM (
  SELECT DISTINCT ON (lc.lote_id)
    lc.lote_id,
    pn.formulacao_id
  FROM public.lote_categorias lc
  JOIN public.planos_nutricionais pn
    ON pn.lote_categoria_id = lc.id AND pn.ativo = true
  WHERE lc.ativo = true
    AND lc.data_fim IS NULL
    AND pn.formulacao_id IS NOT NULL
  ORDER BY lc.lote_id, pn.data_inicio ASC
) sub
WHERE l.id = sub.lote_id
  AND l.formulacao_id IS NULL;
