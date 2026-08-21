-- ============================================================================
-- MIGRATION H — Normalização de planos vigentes por lote
-- ============================================================================
-- Objetivo: lotes existentes com categorias e planos vigentes distintos
-- precisam ser normalizados. O plano mais antigo (menor data_inicio) vira o
-- plano do lote; os demais são encerrados via encerrar_plano_nutricional.
--
-- Esta migration é sensível e deve ser validada na branch com dados reais
-- antes de promover. Rodar a query de diagnóstico primeiro para quantificar
-- o passivo.
-- ============================================================================

-- 1. Query de diagnóstico (não executa mudanças, só reporta)
-- Rodar manualmente para verificar quantos lotes precisam de normalização:
--
-- SELECT l.id, l.nome, COUNT(DISTINCT pn.id) AS planos_vigentes,
--        array_agg(pn.id ORDER BY pn.data_inicio) AS plano_ids,
--        array_agg(pn.formulacao_id ORDER BY pn.data_inicio) AS formulacao_ids,
--        array_agg(lc.categoria ORDER BY pn.data_inicio) AS categorias
-- FROM public.lotes l
-- JOIN public.lote_categorias lc ON lc.lote_id = l.id AND lc.ativo = true AND lc.data_fim IS NULL
-- JOIN public.planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
-- WHERE l.ativo = true
-- GROUP BY l.id, l.nome
-- HAVING COUNT(DISTINCT pn.id) > 1
-- ORDER BY planos_vigentes DESC;

-- 2. Normalização: para cada lote com múltiplos planos vigentes,
--    manter o plano mais antigo (menor data_inicio) e encerrar os demais.
--
--    O plano vencedor é determinado por DISTINCT ON (lote_id) com ORDER BY
--    data_inicio ASC. Todos os outros planos ativos do mesmo lote são
--    encerrados via encerrar_plano_nutricional.
--
--    Após encerrar, lotes.formulacao_id já foi setado na Migration A com a
--    formulação do plano mais antigo, então não precisa atualizar aqui.
--
--    A trigger da Migration D (sync_gmd_lote_categorias) vai repropagar o GMD
--    para as categorias restantes com base na formulação do lote.

DO $$
DECLARE
  v_lote_id uuid;
  v_plano_vencedor_id uuid;
  v_lote_categoria_id uuid;
  v_plano_id uuid;
  v_count integer := 0;
BEGIN
  -- Para cada lote com mais de um plano vigente
  FOR v_lote_id IN
    SELECT l.id
    FROM public.lotes l
    WHERE l.ativo = true
      AND (
        SELECT COUNT(DISTINCT pn.id)
        FROM public.lote_categorias lc
        JOIN public.planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
        WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.data_fim IS NULL
      ) > 1
  LOOP
    -- Identificar o plano vencedor (menor data_inicio)
    SELECT DISTINCT ON (lc.lote_id)
      pn.id, lc.id AS lote_categoria_id
    INTO v_plano_vencedor_id, v_lote_categoria_id
    FROM public.lote_categorias lc
    JOIN public.planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
    WHERE lc.lote_id = v_lote_id AND lc.ativo = true AND lc.data_fim IS NULL
    ORDER BY lc.lote_id, pn.data_inicio ASC;

    -- Encerrar todos os outros planos ativos do lote
    FOR v_plano_id, v_lote_categoria_id IN
      SELECT pn.id, pn.lote_categoria_id
      FROM public.planos_nutricionais pn
      JOIN public.lote_categorias lc ON lc.id = pn.lote_categoria_id
      WHERE lc.lote_id = v_lote_id
        AND lc.ativo = true
        AND lc.data_fim IS NULL
        AND pn.ativo = true
        AND pn.id <> v_plano_vencedor_id
    LOOP
      -- encerrar_plano_nutricional cria snapshot de saída e desativa o plano
      BEGIN
        PERFORM public.encerrar_plano_nutricional(v_lote_categoria_id);
        v_count := v_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao encerrar plano % do lote %: %', v_plano_id, v_lote_id, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Normalização concluída: % planos encerrados.', v_count;
END;
$$;

-- 3. Garantir que lotes.formulacao_id está setado para lotes com plano vigente
--    (re-executa o backfill da Migration A para qualquer lote que ficou sem)
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
