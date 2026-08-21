-- RPC para transferencia de lote entre fazendas do mesmo grupo.
-- SECURITY DEFINER: bypassa RLS (peao da origem nao tem vinculo com a destino).
-- Faz tudo atomico: valida grupo, cria lote na destino, copia lote_categorias,
-- ajusta quant_atual/quant_inicial na parcial, inativa lote origem se total,
-- cria notificacoes para controllers de ambas as fazendas.

CREATE OR REPLACE FUNCTION public.transferir_lote_entre_fazendas(
  p_lote_origem_id uuid,
  p_fazenda_destino_id uuid,
  p_categorias jsonb,  -- [{"categoria": "Boi Magro", "numero_cabecas": 25}, ...]
  p_nome_usuario text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_lote RECORD;
  v_fazenda_origem RECORD;
  v_fazenda_destino RECORD;
  v_grupo_id uuid;
  v_novo_lote_id uuid;
  v_novo_lote_nome text;
  v_cat_item jsonb;
  v_categoria text;
  v_cabecas int;
  v_total_transferir int := 0;
  v_total_origem int := 0;
  v_is_total boolean;
  v_cat_origem RECORD;
  v_sufixo text;
  v_nome_base text;
  v_sufixo_num int := 0;
  v_controller RECORD;
  v_categorias_desc text;
  v_result jsonb;
BEGIN
  -- 1. Carregar lote origem
  SELECT * INTO v_lote FROM lotes WHERE id = p_lote_origem_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lote origem nao encontrado');
  END IF;

  -- 2. Carregar fazendas e validar grupo
  SELECT id, nome, grupo_id INTO v_fazenda_origem FROM fazendas WHERE id = v_lote.fazenda_id;
  SELECT id, nome, grupo_id INTO v_fazenda_destino FROM fazendas WHERE id = p_fazenda_destino_id;

  IF v_fazenda_origem.grupo_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fazenda origem nao pertence a nenhum grupo');
  END IF;
  IF v_fazenda_destino.grupo_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fazenda destino nao pertence a nenhum grupo');
  END IF;
  IF v_fazenda_origem.grupo_id <> v_fazenda_destino.grupo_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fazendas nao pertencem ao mesmo grupo');
  END IF;
  IF v_fazenda_origem.id = v_fazenda_destino.id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fazenda destino igual a origem');
  END IF;

  -- 3. Validar categorias e calcular totais
  IF p_categorias IS NULL OR jsonb_array_length(p_categorias) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhuma categoria informada');
  END IF;

  FOR v_cat_item IN SELECT * FROM jsonb_array_elements(p_categorias) LOOP
    v_categoria := v_cat_item->>'categoria';
    v_cabecas := (v_cat_item->>'numero_cabecas')::int;
    IF v_cabecas IS NULL OR v_cabecas <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cabecas invalidas para categoria: ' || v_categoria);
    END IF;
    -- Validar que a categoria existe no lote origem e tem cabecas suficientes
    SELECT * INTO v_cat_origem
    FROM lote_categorias
    WHERE lote_id = p_lote_origem_id
      AND LOWER(categoria) = LOWER(v_categoria)
      AND ativo = true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Categoria nao encontrada no lote origem: ' || v_categoria);
    END IF;
    IF v_cabecas > COALESCE(v_cat_origem.quant_atual, 0) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cabecas excedem disponivel para categoria: ' || v_categoria);
    END IF;
    v_total_transferir := v_total_transferir + v_cabecas;
  END LOOP;

  -- Total atual do lote origem (soma de quant_atual de categorias ativas)
  SELECT COALESCE(SUM(quant_atual), 0) INTO v_total_origem
  FROM lote_categorias
  WHERE lote_id = p_lote_origem_id AND ativo = true;

  v_is_total := (v_total_transferir >= v_total_origem);

  -- 4. Gerar nome do novo lote na destino (sufixar se colidir)
  v_nome_base := v_lote.nome;
  v_novo_lote_nome := v_nome_base;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM lotes WHERE fazenda_id = p_fazenda_destino_id AND nome = v_novo_lote_nome AND deleted_at IS NULL) THEN
      EXIT;
    END IF;
    v_sufixo_num := v_sufixo_num + 1;
    v_novo_lote_nome := v_nome_base || ' (' || v_sufixo_num::text || ')';
    IF v_sufixo_num > 99 THEN
      v_novo_lote_nome := v_nome_base || ' (transferido ' || to_char(now(), 'YYYYMMDDHH24MI') || ')';
      EXIT;
    END IF;
  END LOOP;

  -- 5. Criar lote na destino (snapshot completo, sem pasto_id/modulo_id que sao especificos da origem)
  INSERT INTO lotes (
    fazenda_id, nome, n_cabecas, categorias, qtd_bezerros, ativo,
    numero_cabecas, quantidade_bezerros,
    raca, sexo, idade_meses, rc_inicial, preco_kg, preco_cab,
    custo_operacional_reais_cab_dia, estrategia_nutricional,
    produtor_rural, propriedade_origem, numero_contrato, mes_competencia,
    data_liberacao_sisbov, periodo_liberacao_sisbov, data_embarque_previsto,
    quant_inicial, peso_entrada_kg, gmd, data_pesagem, data_meta,
    peso_vivo_meta_kg, peso_vivo_kg, peso_entrada_kg_cab, periodo,
    sistema_producao, preco_animal_kg, preco_animal_cab, idade,
    dias_restantes_meta, data_embarque_prevista, meta_intervalo_rodeio_dias,
    data_proximo_rodeio, destino
  ) VALUES (
    p_fazenda_destino_id, v_novo_lote_nome, v_total_transferir, v_lote.categorias, v_lote.qtd_bezerros, true,
    v_total_transferir, v_lote.quantidade_bezerros,
    v_lote.raca, v_lote.sexo, v_lote.idade_meses, v_lote.rc_inicial, v_lote.preco_kg, v_lote.preco_cab,
    v_lote.custo_operacional_reais_cab_dia, v_lote.estrategia_nutricional,
    v_lote.produtor_rural, v_lote.propriedade_origem, v_lote.numero_contrato, v_lote.mes_competencia,
    v_lote.data_liberacao_sisbov, v_lote.periodo_liberacao_sisbov, v_lote.data_embarque_previsto,
    v_total_transferir, v_lote.peso_entrada_kg, v_lote.gmd, v_lote.data_pesagem, v_lote.data_meta,
    v_lote.peso_vivo_meta_kg, v_lote.peso_vivo_kg, v_lote.peso_entrada_kg_cab, v_lote.periodo,
    v_lote.sistema_producao, v_lote.preco_animal_kg, v_lote.preco_animal_cab, v_lote.idade,
    v_lote.dias_restantes_meta, v_lote.data_embarque_prevista, v_lote.meta_intervalo_rodeio_dias,
    v_lote.data_proximo_rodeio, v_lote.destino
  )
  RETURNING id INTO v_novo_lote_id;

  -- 6. Criar lote_categorias na destino (snapshot sem formulacao_id/plano nutricional)
  FOR v_cat_item IN SELECT * FROM jsonb_array_elements(p_categorias) LOOP
    v_categoria := v_cat_item->>'categoria';
    v_cabecas := (v_cat_item->>'numero_cabecas')::int;

    SELECT * INTO v_cat_origem
    FROM lote_categorias
    WHERE lote_id = p_lote_origem_id
      AND LOWER(categoria) = LOWER(v_categoria)
      AND ativo = true;

    INSERT INTO lote_categorias (
      lote_id, categoria, quant_inicial, quant_atual,
      data_pesagem, peso_entrada_kg_cab, peso_entrada_arrobas, gmd, periodo,
      rc_inicial, peso_vivo_atual_kg_cab, peso_vivo_meta_kg_cab, dias_restantes_meta,
      estrategia_nutricional, raca, sexo, idade, ativo,
      morte, consumo, abate, transf_entrada, transf_saida, qtd_bezerros,
      consumo_meta_porcentagem_pesovivo, rc_final, peso_venda_meta_arroba,
      margem_lucro_percent, preco_custo_reais_arroba, preco_custo_cab,
      preco_venda_projetado_reais_arroba, preco_venda_sugerido_cab, rc_atual,
      peso_vivo_atual_arroba_cab, producao_atual_arroba_cab, producao_projetada_arroba_cab,
      preco_entrada_reais_arroba, faturamento_projetado_reais_lote_categoria,
      venda_total_arroba_lote_categoria, agio_percent, custo_frete_reais_cab,
      custo_comissao_reais_cab, custo_sanidade_reais_cab,
      custo_identificacao_rastreabilidade_reais_cab, custo_total_entrada_reais_cab,
      custo_total_entrada_reais_lote, data_ajuste_peso, categoria_origem_id
    ) VALUES (
      v_novo_lote_id, v_cat_origem.categoria, v_cabecas, v_cabecas,
      v_cat_origem.data_pesagem, v_cat_origem.peso_entrada_kg_cab, v_cat_origem.peso_entrada_arrobas,
      v_cat_origem.gmd, v_cat_origem.periodo, v_cat_origem.rc_inicial,
      v_cat_origem.peso_vivo_atual_kg_cab, v_cat_origem.peso_vivo_meta_kg_cab, v_cat_origem.dias_restantes_meta,
      v_cat_origem.estrategia_nutricional, v_cat_origem.raca, v_cat_origem.sexo, v_cat_origem.idade, true,
      0, 0, 0, v_cabecas, 0, v_cat_origem.qtd_bezerros,
      v_cat_origem.consumo_meta_porcentagem_pesovivo, v_cat_origem.rc_final, v_cat_origem.peso_venda_meta_arroba,
      v_cat_origem.margem_lucro_percent, v_cat_origem.preco_custo_reais_arroba, v_cat_origem.preco_custo_cab,
      v_cat_origem.preco_venda_projetado_reais_arroba, v_cat_origem.preco_venda_sugerido_cab, v_cat_origem.rc_atual,
      v_cat_origem.peso_vivo_atual_arroba_cab, v_cat_origem.producao_atual_arroba_cab, v_cat_origem.producao_projetada_arroba_cab,
      v_cat_origem.preco_entrada_reais_arroba, v_cat_origem.faturamento_projetado_reais_lote_categoria,
      v_cat_origem.venda_total_arroba_lote_categoria, v_cat_origem.agio_percent, v_cat_origem.custo_frete_reais_cab,
      v_cat_origem.custo_comissao_reais_cab, v_cat_origem.custo_sanidade_reais_cab,
      v_cat_origem.custo_identificacao_rastreabilidade_reais_cab, v_cat_origem.custo_total_entrada_reais_cab,
      v_cat_origem.custo_total_entrada_reais_lote, v_cat_origem.data_ajuste_peso, NULL
    );
  END LOOP;

  -- 7. Ajustar lote origem
  IF v_is_total THEN
    -- Inativar lote origem
    UPDATE lotes SET ativo = false, n_cabecas = 0, numero_cabecas = 0, updated_at = now()
    WHERE id = p_lote_origem_id;
    -- Inativar categorias do lote origem
    UPDATE lote_categorias SET ativo = false, quant_atual = 0, updated_at = now()
    WHERE lote_id = p_lote_origem_id AND ativo = true;
  ELSE
    -- Parcial: ajustar quant_atual das categorias transferidas
    FOR v_cat_item IN SELECT * FROM jsonb_array_elements(p_categorias) LOOP
      v_categoria := v_cat_item->>'categoria';
      v_cabecas := (v_cat_item->>'numero_cabecas')::int;
      UPDATE lote_categorias
      SET quant_atual = quant_atual - v_cabecas,
          transf_saida = transf_saida + v_cabecas,
          updated_at = now()
      WHERE lote_id = p_lote_origem_id
        AND LOWER(categoria) = LOWER(v_categoria)
        AND ativo = true;
    END LOOP;
    -- Atualizar n_cabecas do lote origem
    UPDATE lotes
    SET n_cabecas = GREATEST(COALESCE(n_cabecas, 0) - v_total_transferir, 0),
        numero_cabecas = GREATEST(COALESCE(numero_cabecas, 0) - v_total_transferir, 0),
        updated_at = now()
    WHERE id = p_lote_origem_id;
  END IF;

  -- 8. Criar notificacoes para controllers de ambas as fazendas
  -- Descricao das categorias para a mensagem
  SELECT string_agg(c->>'categoria' || ': ' || (c->>'numero_cabecas') || ' cabecas', ', ')
  INTO v_categorias_desc
  FROM jsonb_array_elements(p_categorias) AS c;

  -- Notificacoes para controllers da fazenda DESTINO
  FOR v_controller IN
    SELECT u.id FROM usuarios u
    JOIN usuario_fazenda uf ON u.id = uf.usuario_id
    WHERE uf.fazenda_id = p_fazenda_destino_id
      AND uf.ativo = true
      AND uf.papel IN ('admin', 'controller')
      AND u.id NOT LIKE '%@gestaup.internal%'  -- excluir peoes
  LOOP
    INSERT INTO notificacoes (usuario_id, fazenda_id, tipo, titulo, mensagem, acao_url, acao_label, dados_jsonb)
    VALUES (
      v_controller.id,
      p_fazenda_destino_id,
      'info',
      'Lote recebido por transferencia: ' || v_novo_lote_nome,
      'Lote "' || v_lote.nome || '" recebido da fazenda ' || v_fazenda_origem.nome || ' por transferencia. Categorias: ' || v_categorias_desc || '. Total: ' || v_total_transferir || ' cabecas.',
      '/controller/lotes',
      'Ver lotes',
      jsonb_build_object(
        'tipo_transferencia', 'lote_recebido',
        'lote_origem_id', p_lote_origem_id,
        'lote_destino_id', v_novo_lote_id,
        'lote_nome', v_novo_lote_nome,
        'fazenda_origem_id', v_fazenda_origem.id,
        'fazenda_origem_nome', v_fazenda_origem.nome,
        'fazenda_destino_id', p_fazenda_destino_id,
        'categorias', p_categorias,
        'total_cabecas', v_total_transferir,
        'transferencia_total', v_is_total
      )
    );
  END LOOP;

  -- Notificacoes para controllers da fazenda ORIGEM
  FOR v_controller IN
    SELECT u.id FROM usuarios u
    JOIN usuario_fazenda uf ON u.id = uf.usuario_id
    WHERE uf.fazenda_id = v_fazenda_origem.id
      AND uf.ativo = true
      AND uf.papel IN ('admin', 'controller')
      AND u.id NOT LIKE '%@gestaup.internal%'  -- excluir peoes
  LOOP
    INSERT INTO notificacoes (usuario_id, fazenda_id, tipo, titulo, mensagem, acao_url, acao_label, dados_jsonb)
    VALUES (
      v_controller.id,
      v_fazenda_origem.id,
      'info',
      'Lote transferido para ' || v_fazenda_destino.nome,
      'Lote "' || v_lote.nome || '" transferido para a fazenda ' || v_fazenda_destino.nome || '. Categorias: ' || v_categorias_desc || '. Total: ' || v_total_transferir || ' cabecas.' || CASE WHEN v_is_total THEN ' Lote inativado na origem.' ELSE ' Lote permanece ativo com ' || (v_total_origem - v_total_transferir) || ' cabecas.' END,
      '/controller/lotes',
      'Ver lotes',
      jsonb_build_object(
        'tipo_transferencia', 'lote_enviado',
        'lote_origem_id', p_lote_origem_id,
        'lote_destino_id', v_novo_lote_id,
        'lote_nome', v_lote.nome,
        'fazenda_origem_id', v_fazenda_origem.id,
        'fazenda_destino_id', p_fazenda_destino_id,
        'fazenda_destino_nome', v_fazenda_destino.nome,
        'categorias', p_categorias,
        'total_cabecas', v_total_transferir,
        'transferencia_total', v_is_total
      )
    );
  END LOOP;

  -- 9. Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'lote_destino_id', v_novo_lote_id,
    'lote_destino_nome', v_novo_lote_nome,
    'fazenda_destino_nome', v_fazenda_destino.nome,
    'total_cabecas', v_total_transferir,
    'transferencia_total', v_is_total
  );

  RETURN v_result;
END;
$function$;;
