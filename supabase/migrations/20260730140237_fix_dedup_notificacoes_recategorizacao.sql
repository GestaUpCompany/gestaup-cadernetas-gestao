-- Corrigir dedup da RPC: verificar ANY notificacao para o lote_categoria_id,
-- independente de lida ou deleted_at. Assim, se o usuario leu ou deletou,
-- a RPC nao cria outra.
CREATE OR REPLACE FUNCTION public.gerar_notificacoes_recategorizacao(
  p_fazenda_id uuid,
  p_usuario_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inseridas integer := 0;
  v_lote RECORD;
  v_percentual numeric;
  v_dias_restantes integer;
  v_mensagem text;
  v_gmd numeric;
  v_threshold numeric := 95.0;
  v_ativo boolean := true;
  v_config RECORD;
BEGIN
  -- Ler config da fazenda
  SELECT threshold_recategorizacao, recategorizacao_ativo INTO v_config
  FROM public.notificacoes_config
  WHERE fazenda_id = p_fazenda_id;

  IF FOUND THEN
    v_threshold := v_config.threshold_recategorizacao / 100.0;
    v_ativo := v_config.recategorizacao_ativo;
  END IF;

  IF NOT v_ativo THEN
    RETURN 0;
  END IF;

  FOR v_lote IN
    SELECT 
      lc.id AS lote_categoria_id,
      lc.lote_id,
      l.nome AS lote_nome,
      lc.categoria,
      lc.peso_vivo_atual_kg_cab,
      fc.peso_max,
      fc.nome AS faixa_nome,
      COALESCE(pn.gmd_planejado, lc.gmd::numeric) AS gmd
    FROM public.lote_categorias lc
    JOIN public.lotes l ON l.id = lc.lote_id
    LEFT JOIN public.faixas_categorias fc 
      ON fc.fazenda_id = l.fazenda_id 
      AND LOWER(fc.nome) = LOWER(lc.categoria) 
      AND fc.ativo = true
    LEFT JOIN public.planos_nutricionais pn 
      ON pn.lote_categoria_id = lc.id 
      AND pn.ativo = true
    WHERE l.fazenda_id = p_fazenda_id
      AND lc.ativo = true
      AND lc.data_fim IS NULL
      AND lc.peso_vivo_atual_kg_cab IS NOT NULL
      AND fc.peso_max IS NOT NULL
      AND lc.peso_vivo_atual_kg_cab >= (fc.peso_max * v_threshold)
  LOOP
    -- Dedup: se ja existe ANY notificacao para este lote_categoria_id
    -- (mesmo lida ou soft-deletada), pular. O usuario ja foi avisado.
    IF EXISTS (
      SELECT 1 FROM public.notificacoes n
      WHERE n.usuario_id = p_usuario_id
        AND n.fazenda_id = p_fazenda_id
        AND n.dados_jsonb->>'lote_categoria_id' = v_lote.lote_categoria_id::text
        AND n.dados_jsonb->>'tipo_alerta' = 'recategorizacao'
    ) THEN
      CONTINUE;
    END IF;

    v_percentual := ROUND((v_lote.peso_vivo_atual_kg_cab / v_lote.peso_max * 100)::numeric, 1);
    v_gmd := v_lote.gmd;

    IF v_gmd IS NOT NULL AND v_gmd > 0 THEN
      v_dias_restantes := CEIL((v_lote.peso_max - v_lote.peso_vivo_atual_kg_cab) / v_gmd);
      v_mensagem := 'O lote "' || v_lote.lote_nome || '" (' || v_lote.categoria || ') atingiu ' 
        || v_percentual || '% do limite da faixa (' || v_lote.peso_max || ' kg). '
        || 'Peso atual: ' || v_lote.peso_vivo_atual_kg_cab || ' kg. '
        || 'Prazo estimado para recategorizar: ' || v_dias_restantes || ' dias.';
    ELSE
      v_dias_restantes := NULL;
      v_mensagem := 'O lote "' || v_lote.lote_nome || '" (' || v_lote.categoria || ') atingiu ' 
        || v_percentual || '% do limite da faixa (' || v_lote.peso_max || ' kg). '
        || 'Peso atual: ' || v_lote.peso_vivo_atual_kg_cab || ' kg. '
        || 'Prazo indeterminado (sem GMD cadastrado).';
    END IF;

    INSERT INTO public.notificacoes (
      usuario_id, fazenda_id, tipo, titulo, mensagem, 
      lida, acao_url, acao_label, dados_jsonb
    ) VALUES (
      p_usuario_id, p_fazenda_id, 'warning',
      'Recategorização recomendada: ' || v_lote.lote_nome,
      v_mensagem,
      false,
      '/controller/notificacoes',
      'Ver notificações',
      jsonb_build_object(
        'lote_categoria_id', v_lote.lote_categoria_id,
        'lote_id', v_lote.lote_id,
        'lote_nome', v_lote.lote_nome,
        'categoria', v_lote.categoria,
        'peso_atual', v_lote.peso_vivo_atual_kg_cab,
        'limite_sup', v_lote.peso_max,
        'percentual', v_percentual,
        'dias_restantes', v_dias_restantes,
        'tipo_alerta', 'recategorizacao'
      )
    );

    v_inseridas := v_inseridas + 1;
  END LOOP;

  RETURN v_inseridas;
END;
$function$;

SELECT 'RPC dedup corrigida' AS status;;
