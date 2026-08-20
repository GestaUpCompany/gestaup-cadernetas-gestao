-- Migration X: Fix recategorizar_lote_categoria quando categoria destino ja existe inativa
--
-- Bug: a constraint UNIQUE (lote_id, categoria) em lote_categorias impede que
-- recategorizar_lote_categoria renomeie uma categoria para um nome que ja existe
-- como categoria inativa (data_fim NOT NULL) no mesmo lote.
--
-- Fix: antes do UPDATE in-place, se existir uma categoria inativa com o mesmo
-- nome no mesmo lote, deleta-la (junto com suas transicoes) para liberar o nome.
-- Se existir uma categoria ATIVA com o mesmo nome, levantar erro claro.

CREATE OR REPLACE FUNCTION public.recategorizar_lote_categoria(
  p_lote_categoria_origem_id uuid,
  p_categoria_destino text,
  p_manter_formulacao boolean DEFAULT true,
  p_nova_formulacao_id uuid DEFAULT NULL::uuid,
  p_usuario_id uuid DEFAULT NULL::uuid,
  p_motivo text DEFAULT 'manual'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_origem RECORD;
  v_lote RECORD;
  v_fazenda_id uuid;
  v_formulacao_id uuid;
  v_novo_gmd numeric;
  v_peso_transicao numeric;
  v_snapshot jsonb;
  v_lote_snapshot jsonb;
  v_gmd_encontrado boolean := false;
  v_cat_inativa_id uuid;
BEGIN
  -- 1. Carregar lote_categoria atual (deve estar ativa)
  SELECT lc.* INTO v_origem
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_origem_id
    AND lc.ativo = true
    AND lc.data_fim IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote_categoria não encontrada ou já encerrada.';
  END IF;

  -- 2. Carregar lote + fazenda
  SELECT l.* INTO v_lote FROM public.lotes l WHERE l.id = v_origem.lote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote não encontrado.';
  END IF;
  v_fazenda_id := v_lote.fazenda_id;

  -- 3. Peso na transição
  v_peso_transicao := COALESCE(v_origem.peso_vivo_atual_kg_cab, v_origem.peso_entrada_kg_cab);

  -- 4. Snapshot da lote_categoria origem (antes da mudança)
  SELECT to_jsonb(lc.*) INTO v_snapshot
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_origem_id;

  -- 4b. Snapshot do lote
  SELECT to_jsonb(l.*) INTO v_lote_snapshot
  FROM public.lotes l
  WHERE l.id = v_origem.lote_id;

  -- 5. Carregar formulação vigente do lote
  v_formulacao_id := v_lote.formulacao_id;

  -- 6. Match do GMD da nova categoria na formulação
  IF v_formulacao_id IS NOT NULL THEN
    SELECT fcg.gmd INTO v_novo_gmd
    FROM public.formulacao_categorias_gmd fcg
    WHERE fcg.formulacao_id = v_formulacao_id
      AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(p_categoria_destino))
    LIMIT 1;

    v_gmd_encontrado := FOUND;
  END IF;

  -- 6b. Verificar se ja existe categoria ativa com o mesmo nome no lote
  IF EXISTS (
    SELECT 1 FROM public.lote_categorias lc
    WHERE lc.lote_id = v_origem.lote_id
      AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(p_categoria_destino))
      AND lc.ativo = true
      AND lc.data_fim IS NULL
      AND lc.id <> p_lote_categoria_origem_id
  ) THEN
    RAISE EXCEPTION 'Já existe uma categoria ativa "%" no lote.', p_categoria_destino;
  END IF;

  -- 6c. Se existe categoria inativa com o mesmo nome, deletar (libera o nome)
  SELECT lc.id INTO v_cat_inativa_id
  FROM public.lote_categorias lc
  WHERE lc.lote_id = v_origem.lote_id
    AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(p_categoria_destino))
    AND (lc.ativo = false OR lc.data_fim IS NOT NULL)
    AND lc.id <> p_lote_categoria_origem_id
  LIMIT 1;

  IF v_cat_inativa_id IS NOT NULL THEN
    -- Deletar transicoes da categoria inativa
    DELETE FROM public.lote_categorias_transicoes
    WHERE lote_categoria_origem_id = v_cat_inativa_id
       OR lote_categoria_destino_id = v_cat_inativa_id;
    -- Deletar personalizacao de plano da categoria inativa
    DELETE FROM public.plano_categoria_personalizacao
    WHERE lote_categoria_id = v_cat_inativa_id;
    -- Deletar a categoria inativa
    DELETE FROM public.lote_categorias WHERE id = v_cat_inativa_id;
  END IF;

  -- 7. Atualizar a categoria in-place
  --    Se GMD não encontrado, gmd fica NULL (categoria para de evoluir)
  UPDATE public.lote_categorias
  SET categoria = p_categoria_destino,
      gmd = CASE WHEN v_novo_gmd IS NOT NULL THEN v_novo_gmd::text ELSE NULL END
  WHERE id = p_lote_categoria_origem_id;

  -- 8. Registrar auditoria da transição
  --    lote_categoria_origem_id = lote_categoria_destino_id (mesma linha,
  --    pois não criamos nova lote_categorias)
  INSERT INTO public.lote_categorias_transicoes (
    fazenda_id, lote_id, lote_categoria_origem_id, lote_categoria_destino_id,
    categoria_origem, categoria_destino, peso_na_transicao_kg,
    data_transicao, motivo, usuario_id, snapshot_jsonb
  ) VALUES (
    v_fazenda_id,
    v_origem.lote_id,
    p_lote_categoria_origem_id,
    p_lote_categoria_origem_id,
    v_origem.categoria,
    p_categoria_destino,
    v_peso_transicao,
    now(),
    p_motivo,
    p_usuario_id,
    jsonb_build_object(
      'lote_categoria_origem', v_snapshot,
      'lote_origem', v_lote_snapshot,
      'categoria_origem', v_origem.categoria,
      'categoria_destino', p_categoria_destino,
      'formulacao_id', v_formulacao_id,
      'gmd_novo', v_novo_gmd,
      'gmd_encontrado', v_gmd_encontrado,
      'recategorizacao_inplace', true,
      'categoria_inativa_removida', v_cat_inativa_id
    )
  );

  -- 9. Retornar o mesmo ID (não criamos nova linha)
  RETURN p_lote_categoria_origem_id;
END;
$function$;
