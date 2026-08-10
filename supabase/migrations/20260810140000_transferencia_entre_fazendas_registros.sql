-- Migration: Registrar transferência entre fazendas em registros_movimentacao
-- Adiciona enum Transferencia ao motivo, Saida/Entrada ao subtipo,
-- coluna fazenda_destino_id em registros_movimentacao, e atualiza a RPC
-- transferir_lote_entre_fazendas para inserir os registros de movimentação.

-- ============================================================
-- PARTE 1: Extender enums
-- ============================================================

-- Adicionar 'Transferencia' ao enum tipo_movimentacao_motivo
ALTER TYPE public.tipo_movimentacao_motivo ADD VALUE IF NOT EXISTS 'Transferencia';

-- Adicionar 'Saida' e 'Entrada' ao enum tipo_movimentacao_subtipo
ALTER TYPE public.tipo_movimentacao_subtipo ADD VALUE IF NOT EXISTS 'Saida';
ALTER TYPE public.tipo_movimentacao_subtipo ADD VALUE IF NOT EXISTS 'Entrada';

-- ============================================================
-- PARTE 2: Coluna fazenda_destino_id em registros_movimentacao
-- ============================================================

ALTER TABLE public.registros_movimentacao
  ADD COLUMN IF NOT EXISTS fazenda_destino_id uuid REFERENCES public.fazendas(id) ON DELETE SET NULL;

-- Índice para consultas por fazenda destino (transferências recebidas)
CREATE INDEX IF NOT EXISTS idx_registros_movimentacao_fazenda_destino_id
  ON public.registros_movimentacao (fazenda_destino_id)
  WHERE fazenda_destino_id IS NOT NULL;

-- ============================================================
-- PARTE 3: Atualizar RPC transferir_lote_entre_fazendas
-- ============================================================
-- A RPC agora insere 2 registros em registros_movimentacao:
--   1. Na fazenda origem: motivo='Transferencia', subtipo='Saida'
--   2. Na fazenda destino: motivo='Transferencia', subtipo='Entrada'
-- Ambos com fazenda_destino_id preenchido para rastrear o cruzamento.

CREATE OR REPLACE FUNCTION public.transferir_lote_entre_fazendas(
  p_lote_origem_id uuid,
  p_fazenda_destino_id uuid,
  p_categorias jsonb,
  p_nome_usuario text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_lote RECORD;
  v_fazenda_origem RECORD;
  v_fazenda_destino RECORD;
  v_novo_lote_id uuid;
  v_novo_lote_nome text;
  v_cat_item jsonb;
  v_categoria text;
  v_cabecas int;
  v_total_transferir int := 0;
  v_total_origem int := 0;
  v_total_restante int;
  v_is_total boolean;
  v_cat_origem RECORD;
  v_sufixo_num int := 1;
  v_controller RECORD;
  v_categorias_desc text;
  v_result jsonb;
  v_nome_base text;
  v_categorias_nomes text;
  v_data_mov timestamp with time zone := now();
  v_observacao_saida text;
  v_observacao_entrada text;
BEGIN
  SELECT * INTO v_lote FROM lotes WHERE id = p_lote_origem_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lote origem nao encontrado');
  END IF;

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

  IF p_categorias IS NULL OR jsonb_array_length(p_categorias) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhuma categoria informada');
  END IF;

  FOR v_cat_item IN SELECT * FROM jsonb_array_elements(p_categorias) LOOP
    v_categoria := v_cat_item->>'categoria';
    v_cabecas := (v_cat_item->>'numero_cabecas')::int;
    IF v_cabecas IS NULL OR v_cabecas <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cabecas invalidas para categoria: ' || v_categoria);
    END IF;
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

  SELECT COALESCE(SUM(quant_atual), 0) INTO v_total_origem
  FROM lote_categorias
  WHERE lote_id = p_lote_origem_id AND ativo = true;

  v_is_total := (v_total_transferir >= v_total_origem);
  v_total_restante := GREATEST(v_total_origem - v_total_transferir, 0);

  -- Sempre adiciona sufixo (1), (2), etc., mesmo sem colisao
  v_nome_base := v_lote.nome;
  v_novo_lote_nome := v_nome_base || ' (' || v_sufixo_num::text || ')';
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

  IF v_is_total THEN
    UPDATE lotes SET ativo = false, n_cabecas = 0, numero_cabecas = 0, updated_at = now()
    WHERE id = p_lote_origem_id;
    UPDATE lote_categorias SET ativo = false, quant_atual = 0, updated_at = now()
    WHERE lote_id = p_lote_origem_id AND ativo = true;
  ELSE
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
    UPDATE lotes
    SET n_cabecas = v_total_restante,
        numero_cabecas = v_total_restante,
        updated_at = now()
    WHERE id = p_lote_origem_id;
  END IF;

  -- Descricao das categorias para observacoes e notificacoes
  v_categorias_nomes := '';
  FOR v_cat_item IN SELECT * FROM jsonb_array_elements(p_categorias) LOOP
    IF v_categorias_nomes <> '' THEN v_categorias_nomes := v_categorias_nomes || ', '; END IF;
    v_categorias_nomes := v_categorias_nomes || (v_cat_item->>'categoria') || ': ' || (v_cat_item->>'numero_cabecas') || ' cabecas';
  END LOOP;

  v_observacao_saida := 'Transferencia para ' || v_fazenda_destino.nome || '. Lote criado: ' || v_novo_lote_nome || '.';
  v_observacao_entrada := 'Transferencia recebida de ' || v_fazenda_origem.nome || '. Lote origem: ' || v_lote.nome || '.';

  -- ============================================================
  -- Registrar movimentacoes em registros_movimentacao
  -- ============================================================

  -- 1. Registro de SAIDA na fazenda origem
  INSERT INTO registros_movimentacao (
    fazenda_id, data, lote_origem, lote_origem_id,
    destino, lote_destino_id,
    numero_cabecas, categoria,
    motivo_movimentacao, subtipo,
    causa_observacao, responsavel,
    fazenda_destino_id,
    sync_status, version
  ) VALUES (
    v_fazenda_origem.id,
    v_data_mov,
    v_lote.nome,
    p_lote_origem_id,
    v_novo_lote_nome,
    v_novo_lote_id,
    v_total_transferir,
    v_categorias_nomes,
    'Transferencia'::tipo_movimentacao_motivo,
    'Saida'::tipo_movimentacao_subtipo,
    v_observacao_saida,
    p_nome_usuario,
    p_fazenda_destino_id,
    'synced',
    1
  );

  -- 2. Registro de ENTRADA na fazenda destino
  INSERT INTO registros_movimentacao (
    fazenda_id, data, lote_origem, lote_origem_id,
    destino, lote_destino_id,
    numero_cabecas, categoria,
    motivo_movimentacao, subtipo,
    causa_observacao, responsavel,
    fazenda_destino_id,
    sync_status, version
  ) VALUES (
    v_fazenda_destino.id,
    v_data_mov,
    v_lote.nome,
    p_lote_origem_id,
    v_novo_lote_nome,
    v_novo_lote_id,
    v_total_transferir,
    v_categorias_nomes,
    'Transferencia'::tipo_movimentacao_motivo,
    'Entrada'::tipo_movimentacao_subtipo,
    v_observacao_entrada,
    p_nome_usuario,
    p_fazenda_destino_id,
    'synced',
    1
  );

  -- ============================================================
  -- Notificacoes (mantidas da versao anterior)
  -- ============================================================

  FOR v_controller IN
    SELECT u.id FROM usuarios u
    JOIN usuario_fazenda uf ON u.id = uf.usuario_id
    WHERE uf.fazenda_id = v_fazenda_destino.id
      AND uf.ativo = true
      AND uf.papel IN ('admin', 'controller')
      AND u.email NOT LIKE '%@gestaup.internal%'
  LOOP
    INSERT INTO notificacoes (usuario_id, fazenda_id, tipo, titulo, mensagem, acao_url, acao_label, dados_jsonb)
    VALUES (
      v_controller.id,
      v_fazenda_destino.id,
      'info',
      'Lote recebido por transferencia: ' || v_novo_lote_nome,
      'Lote "' || v_lote.nome || '" recebido da fazenda ' || v_fazenda_origem.nome || ' por transferencia. Categorias: ' || v_categorias_nomes || '. Total: ' || v_total_transferir || ' cabecas.',
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

  FOR v_controller IN
    SELECT u.id FROM usuarios u
    JOIN usuario_fazenda uf ON u.id = uf.usuario_id
    WHERE uf.fazenda_id = v_fazenda_origem.id
      AND uf.ativo = true
      AND uf.papel IN ('admin', 'controller')
      AND u.email NOT LIKE '%@gestaup.internal%'
  LOOP
    INSERT INTO notificacoes (usuario_id, fazenda_id, tipo, titulo, mensagem, acao_url, acao_label, dados_jsonb)
    VALUES (
      v_controller.id,
      v_fazenda_origem.id,
      'info',
      'Lote transferido para ' || v_fazenda_destino.nome,
      'Lote "' || v_lote.nome || '" transferido para a fazenda ' || v_fazenda_destino.nome || '. Categorias: ' || v_categorias_nomes || '. Total: ' || v_total_transferir || ' cabecas.' || CASE WHEN v_is_total THEN ' Lote inativado na origem.' ELSE ' Lote permanece ativo com ' || v_total_restante || ' cabecas.' END,
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
$function$;

-- ============================================================
-- PARTE 4: RLS para a nova coluna fazenda_destino_id
-- ============================================================
-- A RLS existente em registros_movimentacao filtra por fazenda_id.
-- A coluna fazenda_destino_id é apenas referencial (não muda a policy),
-- pois o registro de entrada fica na fazenda destino (fazenda_id = destino)
-- e o de saída fica na fazenda origem (fazenda_id = origem).
-- Quem tem acesso à fazenda_id vê o registro; fazenda_destino_id é
-- informativo para saber para onde os animais foram.
