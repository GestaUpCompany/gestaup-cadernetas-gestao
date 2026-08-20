-- Migration W: Backfill de propagacao GMD lotes -> lote_categorias
--
-- Bug estrutural: a Migration A seta lotes.formulacao_id e a Migration D cria
-- a trigger que propaga GMD para lote_categorias. Se A roda antes de D, a
-- trigger nao existe e o GMD nao e propagado. Categorias ficam com gmd = NULL
-- mesmo quando a formulação do lote as cobre.
--
-- Fix: repropagar GMD para todas as categorias ativas de lotes ativos com
-- formulacao_id, garantindo que o GMD venha de formulacao_categorias_gmd.
-- Idempotente: so atualiza onde gmd IS NULL OR gmd = '' OR gmd != gmd_formulacao.

-- 1. Setar GMD de categorias cobertas pela formulacao do lote
UPDATE public.lote_categorias lc
  SET gmd = fcg.gmd::text
  FROM public.formulacao_categorias_gmd fcg
  JOIN public.lotes l ON l.formulacao_id = fcg.formulacao_id
  WHERE lc.lote_id = l.id
    AND l.ativo = true
    AND lc.ativo = true
    AND lc.data_fim IS NULL
    AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria))
    AND (lc.gmd IS NULL OR lc.gmd = '' OR NULLIF(lc.gmd, '')::numeric != fcg.gmd)
    AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerro ao pe'
    AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerra ao pe';

-- 2. Limpar GMD de categorias NAO cobertas pela formulacao do lote
-- (exceto bezerros ao pe, que tem GMD proprio)
UPDATE public.lote_categorias lc
  SET gmd = NULL
  FROM public.lotes l
  WHERE lc.lote_id = l.id
    AND l.ativo = true
    AND l.formulacao_id IS NOT NULL
    AND lc.ativo = true
    AND lc.data_fim IS NULL
    AND NULLIF(lc.gmd, '')::numeric IS NOT NULL
    AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerro ao pe'
    AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerra ao pe'
    AND NOT EXISTS (
      SELECT 1 FROM public.formulacao_categorias_gmd fcg
      WHERE fcg.formulacao_id = l.formulacao_id
        AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(lc.categoria))
    );
