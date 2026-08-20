CREATE OR REPLACE FUNCTION public.recategorizar_lote_categoria(p_lote_categoria_origem_id uuid, p_categoria_destino text, p_manter_formulacao boolean DEFAULT true, p_nova_formulacao_id uuid DEFAULT NULL::uuid, p_usuario_id uuid DEFAULT NULL::uuid, p_motivo text DEFAULT 'manual'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_origem RECORD;
  v_lote RECORD;
  v_fazenda_id uuid;
  v_novo_lote_categoria_id uuid;
  v_plano_origem RECORD;
  v_tem_plano_origem boolean := false;
  v_peso_transicao numeric;
  v_snapshot jsonb;
  v_plano_snapshot jsonb;
  v_novo_formulacao_id uuid;
  v_formulacao RECORD;
  v_novo_gmd numeric;
  v_novo_nome_plano text;
BEGIN
  -- 1. Carregar origem
  SELECT lc.* INTO v_origem
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_origem_id
    AND lc.data_fim IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote_categoria origem não encontrada ou já encerrada.';
  END IF;

  -- 2. Carregar lote + fazenda
  SELECT l.* INTO v_lote FROM public.lotes l WHERE l.id = v_origem.lote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote não encontrado.';
  END IF;
  SELECT fazenda_id INTO v_fazenda_id FROM public.lotes WHERE id = v_origem.lote_id;

  -- 3. Peso na transição (snapshot antes de qualquer mutação)
  v_peso_transicao := COALESCE(v_origem.peso_vivo_atual_kg_cab, v_origem.peso_entrada_kg_cab);

  -- 4. Capturar snapshot completo da lote_categoria origem (antes de encerrar plano, que limpa campos)
  SELECT to_jsonb(lc.*) INTO v_snapshot
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_origem_id;

  -- 5. Capturar snapshot do plano nutricional ativo (se houver)
  SELECT pn.* INTO v_plano_origem
  FROM public.planos_nutricionais pn
  WHERE pn.lote_categoria_id = p_lote_categoria_origem_id
    AND pn.ativo = true
  LIMIT 1;

  v_tem_plano_origem := FOUND;

  IF v_tem_plano_origem THEN
    SELECT jsonb_build_object(
      'id', v_plano_origem.id,
      'nome', v_plano_origem.nome,
      'formulacao_id', v_plano_origem.formulacao_id,
      'gmd_planejado', v_plano_origem.gmd_planejado,
      'peso_meta_kg', v_plano_origem.peso_meta_kg,
      'periodo_dias', v_plano_origem.periodo_dias,
      'condicao_migracao', v_plano_origem.condicao_migracao,
      'migracao_automatica', v_plano_origem.migracao_automatica,
      'ordem', v_plano_origem.ordem,
      'peso_inicio_kg_cab', v_plano_origem.peso_inicio_kg_cab,
      'rc_inicio', v_plano_origem.rc_inicio,
      'data_inicio', v_plano_origem.data_inicio,
      'data_fim', v_plano_origem.data_fim,
      'ativo', v_plano_origem.ativo
    ) INTO v_plano_snapshot;
  ELSE
    v_plano_snapshot := NULL;
  END IF;

  -- 6. Determinar formulacao_id da nova categoria
  IF p_manter_formulacao THEN
    v_novo_formulacao_id := v_origem.formulacao_id;
  ELSE
    v_novo_formulacao_id := p_nova_formulacao_id;
  END IF;

  -- 7. Encerrar plano nutricional ativo da origem (se houver)
  IF v_tem_plano_origem THEN
    PERFORM public.encerrar_plano_nutricional(p_lote_categoria_origem_id);
  END IF;

  -- 8. Encerrar a lote_categoria origem
  UPDATE public.lote_categorias
  SET data_fim = now(),
      ativo = false
  WHERE id = p_lote_categoria_origem_id;

  -- 9. Criar nova lote_categoria copiando dados operacionais da origem
  INSERT INTO public.lote_categorias (
    lote_id, categoria, quant_inicial, data_pesagem,
    peso_entrada_kg_cab, peso_entrada_arrobas, gmd, periodo,
    rc_inicial, quant_atual, peso_vivo_atual_kg_cab, peso_vivo_meta_kg_cab,
    dias_restantes_meta, data_meta_projetada, estrategia_nutricional,
    raca, sexo, idade, preco_entrada_reais_kg, preco_entrada_reais_cab,
    custo_operacional_reais_cab_dia, morte, consumo, abate,
    transf_entrada, transf_saida, qtd_bezerros, ativo,
    consumo_meta_porcentagem_pesovivo, rc_final,
    peso_venda_meta_arroba, margem_lucro_percent, preco_custo_reais_arroba,
    preco_custo_cab, preco_venda_projetado_reais_arroba, preco_venda_sugerido_cab,
    rc_atual, peso_vivo_atual_arroba_cab, producao_atual_arroba_cab,
    producao_projetada_arroba_cab, preco_entrada_reais_arroba,
    faturamento_projetado_reais_lote_categoria, venda_total_arroba_lote_categoria,
    agio_percent, custo_frete_reais_cab, custo_comissao_reais_cab,
    custo_sanidade_reais_cab, custo_identificacao_rastreabilidade_reais_cab,
    custo_total_entrada_reais_cab, custo_total_entrada_reais_lote,
    formulacao_id, data_ajuste_peso, categoria_origem_id
  ) VALUES (
    v_origem.lote_id, p_categoria_destino, v_origem.quant_inicial, CURRENT_DATE,
    v_peso_transicao, v_origem.peso_entrada_arrobas, v_origem.gmd, 0,
    v_origem.rc_inicial, v_origem.quant_atual, v_peso_transicao, v_origem.peso_vivo_meta_kg_cab,
    NULL, NULL, v_origem.estrategia_nutricional,
    v_origem.raca, v_origem.sexo, v_origem.idade, v_origem.preco_entrada_reais_kg, v_origem.preco_entrada_reais_cab,
    v_origem.custo_operacional_reais_cab_dia, 0, 0, 0,
    0, 0, v_origem.qtd_bezerros, true,
    v_origem.consumo_meta_porcentagem_pesovivo, v_origem.rc_final,
    v_origem.peso_venda_meta_arroba, v_origem.margem_lucro_percent, v_origem.preco_custo_reais_arroba,
    v_origem.preco_custo_cab, v_origem.preco_venda_projetado_reais_arroba, v_origem.preco_venda_sugerido_cab,
    v_origem.rc_atual, v_origem.peso_vivo_atual_arroba_cab, v_origem.producao_atual_arroba_cab,
    v_origem.producao_projetada_arroba_cab, v_origem.preco_entrada_reais_arroba,
    v_origem.faturamento_projetado_reais_lote_categoria, v_origem.venda_total_arroba_lote_categoria,
    v_origem.agio_percent, v_origem.custo_frete_reais_cab, v_origem.custo_comissao_reais_cab,
    v_origem.custo_sanidade_reais_cab, v_origem.custo_identificacao_rastreabilidade_reais_cab,
    v_origem.custo_total_entrada_reais_cab, v_origem.custo_total_entrada_reais_lote,
    v_novo_formulacao_id, NULL, p_lote_categoria_origem_id
  )
  RETURNING id INTO v_novo_lote_categoria_id;

  -- 10. Criar novo plano nutricional
  -- Caso A: origem tinha plano ativo -> criar novo plano com GMD da nova formulação, meta do origem
  -- Caso B: origem NÃO tinha plano, mas usuário TROCOU formulação -> criar novo plano com defaults da formulação
  -- Caso C: origem NÃO tinha plano e usuário MANTEVE -> não criar (mantém estado sem plano)
  IF v_novo_formulacao_id IS NOT NULL THEN
    -- Buscar GMD da nova formulação
    SELECT f.gmd, f.peso_vivo_medio INTO v_formulacao
    FROM public.formulacoes f
    WHERE f.id = v_novo_formulacao_id;
    v_novo_gmd := v_formulacao.gmd;
    v_novo_nome_plano := p_categoria_destino || ' - ' || COALESCE(v_novo_gmd::text, '') || ' kg/dia';

    IF v_tem_plano_origem THEN
      -- Caso A: criar plano com GMD da nova formulação, mantendo meta e config do origem
      INSERT INTO public.planos_nutricionais (
        lote_categoria_id, fazenda_id, nome, formulacao_id,
        periodo_dias, peso_meta_kg, ordem, ativo, data_inicio,
        peso_inicio_kg_cab, rc_inicio, migracao_automatica, gmd_planejado,
        condicao_migracao
      ) VALUES (
        v_novo_lote_categoria_id, v_fazenda_id, v_novo_nome_plano, v_novo_formulacao_id,
        COALESCE(v_plano_origem.periodo_dias, 0), COALESCE(v_plano_origem.peso_meta_kg, v_formulacao.peso_vivo_medio, v_peso_transicao), 0, true, CURRENT_DATE,
        v_peso_transicao, v_plano_origem.rc_inicio, v_plano_origem.migracao_automatica, v_novo_gmd,
        v_plano_origem.condicao_migracao
      );
    ELSIF NOT p_manter_formulacao THEN
      -- Caso B: criar plano com defaults da nova formulação
      INSERT INTO public.planos_nutricionais (
        lote_categoria_id, fazenda_id, nome, formulacao_id,
        periodo_dias, peso_meta_kg, ordem, ativo, data_inicio,
        peso_inicio_kg_cab, rc_inicio, migracao_automatica, gmd_planejado,
        condicao_migracao
      ) VALUES (
        v_novo_lote_categoria_id, v_fazenda_id, v_novo_nome_plano, v_novo_formulacao_id,
        0, COALESCE(v_formulacao.peso_vivo_medio, v_peso_transicao), 0, true, CURRENT_DATE,
        v_peso_transicao, NULL, false, v_novo_gmd,
        'peso'
      );
    END IF;
    -- Caso C: cai no ELSE implícito, não cria plano
  END IF;

  -- 11. Registrar auditoria da transição
  INSERT INTO public.lote_categorias_transicoes (
    fazenda_id, lote_id, lote_categoria_origem_id, lote_categoria_destino_id,
    categoria_origem, categoria_destino, peso_na_transicao_kg,
    data_transicao, motivo, usuario_id, snapshot_jsonb
  ) VALUES (
    v_fazenda_id, v_origem.lote_id, p_lote_categoria_origem_id, v_novo_lote_categoria_id,
    v_origem.categoria, p_categoria_destino, v_peso_transicao,
    now(), p_motivo, p_usuario_id,
    jsonb_build_object(
      'lote_categoria_origem', v_snapshot,
      'plano_nutricional_origem', v_plano_snapshot,
      'manter_formulacao', p_manter_formulacao,
      'nova_formulacao_id', p_nova_formulacao_id
    )
  );

  RETURN v_novo_lote_categoria_id;
END;
$function$;;
