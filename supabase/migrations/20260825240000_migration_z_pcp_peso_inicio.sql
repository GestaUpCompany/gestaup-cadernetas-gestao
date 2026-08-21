-- ============================================================================
-- MIGRATION Z — peso_inicio_kg_cab por categoria no plano de lote
-- ============================================================================
-- Objetivo: cada categoria do lote tem seu próprio peso inicial quando o
-- plano é iniciado, em vez de um peso único para o lote inteiro.
--
-- Antes: o cron usava COALESCE(pn.peso_inicio_kg_cab, lc.peso_entrada_kg_cab).
-- Como o plano agora é do lote, pn.peso_inicio_kg_cab é um valor único que
-- não representa categorias com pesos diferentes (ex: vaca 400kg vs bezerra 170kg).
--
-- Depois: o cron usa COALESCE(pcp.peso_inicio_kg_cab, lc.peso_entrada_kg_cab).
-- Cada categoria tem seu peso inicial capturado em plano_categoria_personalizacao
-- no momento em que o plano é iniciado.
-- ============================================================================

-- 1. Adicionar coluna peso_inicio_kg_cab em plano_categoria_personalizacao
ALTER TABLE public.plano_categoria_personalizacao
  ADD COLUMN IF NOT EXISTS peso_inicio_kg_cab numeric;

-- 2. Backfill: para planos vigentes, usar peso_entrada_kg_cab da categoria
-- como melhor estimativa do peso inicial
UPDATE public.plano_categoria_personalizacao pcp
SET peso_inicio_kg_cab = lc.peso_entrada_kg_cab
FROM public.lote_categorias lc
WHERE pcp.lote_categoria_id = lc.id
  AND pcp.peso_inicio_kg_cab IS NULL
  AND lc.peso_entrada_kg_cab IS NOT NULL;

-- 3. Para planos vigentes onde o peso_vivo_atual_kg_cab é mais confiável
-- que peso_entrada (categorias que já evoluíram), usar o peso atual
-- menos GMD × dias desde início do plano, para reconstruir o peso inicial
UPDATE public.plano_categoria_personalizacao pcp
SET peso_inicio_kg_cab = sub.peso_reconstruido
FROM (
  SELECT pcp2.id, lc.peso_vivo_atual_kg_cab - (
    NULLIF(lc.gmd, '')::numeric * GREATEST(
      (CURRENT_DATE - pn.data_inicio::date)::integer, 0
    )
  ) as peso_reconstruido
  FROM public.plano_categoria_personalizacao pcp2
  JOIN public.lote_categorias lc ON lc.id = pcp2.lote_categoria_id
  JOIN public.planos_nutricionais pn ON pn.id = pcp2.plano_id
  WHERE pcp2.peso_inicio_kg_cab IS NULL
    AND lc.peso_vivo_atual_kg_cab IS NOT NULL
    AND pn.data_inicio IS NOT NULL
    AND NULLIF(lc.gmd, '') IS NOT NULL
) sub
WHERE pcp.id = sub.id;

-- 4. Fallback: se ainda há NULL, usar peso_vivo_atual_kg_cab
UPDATE public.plano_categoria_personalizacao pcp
SET peso_inicio_kg_cab = lc.peso_vivo_atual_kg_cab
FROM public.lote_categorias lc
WHERE pcp.lote_categoria_id = lc.id
  AND pcp.peso_inicio_kg_cab IS NULL
  AND lc.peso_vivo_atual_kg_cab IS NOT NULL;
