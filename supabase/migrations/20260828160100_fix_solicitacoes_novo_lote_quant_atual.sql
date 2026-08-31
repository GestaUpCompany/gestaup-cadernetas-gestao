-- ============================================================
-- Correção: RPCs de solicitacoes_novo_lote + calculate_quant_atual
-- ============================================================
-- Problema 1: notify_solicitacao_novo_lote usava u.id NOT LIKE
--   em uuid, que não suporta operador !~~. Corrigido para (u.id)::text.
--
-- Problema 2: aprovar_solicitacao_novo_lote definia
--   quant_inicial = 0 na categoria nova, deixando a categoria sem
--   quant_inicial. Corrigido para quant_inicial = v_cabecas.
--   Para evitar duplicação (quant_inicial + transf_entrada = 2x),
--   calculate_quant_atual agora exclui subtipo = 'Novo Lote' da soma
--   de transf_entrada, pois a categoria já nasce com as cabeças.
--
-- Problema 3: aprovar_solicitacao_novo_lote subtraía v_cabecas de
--   quant_atual do lote origem, mas a trigger já desconta via
--   calculate_quant_atual (motivo=Saída, tipo_saida NULL entra em saidas).
--   Corrigido para apenas incrementar transf_saida (auditoria).
-- ============================================================

-- ============================================================
-- Função notify_solicitacao_novo_lote (corrigida)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_solicitacao_novo_lote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_controller RECORD;
  v_nome_lote text;
BEGIN
  v_nome_lote := NEW.dados_lote_proposto->>'nome';

  FOR v_controller IN
    SELECT u.id FROM usuarios u
    JOIN usuario_fazenda uf ON u.id = uf.usuario_id
    WHERE uf.fazenda_id = NEW.fazenda_id
      AND uf.ativo = true
      AND uf.papel IN ('admin', 'controller')
      AND (u.id)::text NOT LIKE '%@gestaup.internal'
      AND u.ativo = true
  LOOP
    INSERT INTO notificacoes (usuario_id, fazenda_id, tipo, titulo, mensagem, acao_url, acao_label, dados_jsonb)
    VALUES (
      v_controller.id,
      NEW.fazenda_id,
      'info',
      'Solicitação de Novo Lote: ' || v_nome_lote,
      'O peão solicitou a criação de um novo lote "' || v_nome_lote || '" a partir do lote "' || NEW.lote_origem_nome || '". Acesse Lotes para revisar e aprovar.',
      '/controller/lotes',
      'Revisar em Lotes',
      jsonb_build_object(
        'tipo_solicitacao', 'novo_lote',
        'solicitacao_id', NEW.id,
        'lote_origem_id', NEW.lote_origem_id,
        'lote_origem_nome', NEW.lote_origem_nome,
        'nome_proposto', v_nome_lote
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- Função aprovar_solicitacao_novo_lote (corrigida)
-- ============================================================

-- ============================================================
-- Função calculate_quant_atual (corrigida: exclui subtipo='Novo Lote'
-- da soma de transf_entrada, pois a categoria nova já nasce com
-- quant_inicial = v_cabecas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_quant_atual(p_lote_id uuid, p_categoria text)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_quant_inicial_raw INTEGER;
  v_quant_inicial INTEGER;
  v_created_at timestamptz;
  v_date_cutoff timestamptz;
  v_sum_entradas INTEGER;
  v_sum_saidas INTEGER;
  v_sum_transf_saida INTEGER;
  v_sum_transf_entrada INTEGER;
  v_maternidade_count INTEGER;
  v_morte_count INTEGER;
  v_quant_atual INTEGER;
BEGIN
  SELECT quant_inicial, created_at
  INTO v_quant_inicial_raw, v_created_at
  FROM lote_categorias
  WHERE lote_id = p_lote_id AND LOWER(categoria) = LOWER(p_categoria)
    AND ativo = true
  LIMIT 1;

  IF v_created_at IS NULL THEN
    RETURN 0;
  END IF;

  v_quant_inicial := COALESCE(v_quant_inicial_raw, 0);

  IF v_quant_inicial_raw IS NULL THEN
    v_date_cutoff := '1900-01-01'::timestamptz;
  ELSE
    v_date_cutoff := v_created_at;
  END IF;

  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_entradas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND motivo_movimentacao = 'Entrada'
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_saidas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (motivo_movimentacao IN ('Consumo', 'Saída') OR (motivo_movimentacao = 'Entrevero' AND lote_destino_id IS NULL))
    AND tipo_saida IS NULL
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_saida
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (tipo_saida IN ('Transferência', 'Apartação') OR (motivo_movimentacao = 'Entrevero' AND lote_destino_id IS NOT NULL))
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  -- transf_entrada: soma movimentações de entrada no lote, EXCETO
  -- subtipo='Novo Lote', pois a categoria nova já nasce com
  -- quant_inicial = v_cabecas (a RPC aprovar_solicitacao_novo_lote
  -- seta quant_inicial = número de cabeças movimentadas).
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_entrada
  FROM registros_movimentacao
  WHERE lote_destino_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (tipo_entrada IN ('Transferência', 'Apartação') OR motivo_movimentacao = 'Entrevero' OR (tipo_entrada IS NULL AND lote_destino_id IS NOT NULL))
    AND (subtipo IS NULL OR subtipo <> 'Novo Lote')
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  IF LOWER(unaccent(p_categoria)) ILIKE 'bezerro ao pe' THEN
    SELECT COUNT(*) INTO v_maternidade_count
    FROM registros_maternidade
    WHERE lote_id = p_lote_id AND sexo = 'Macho' AND data >= v_date_cutoff AND deleted_at IS NULL;
  ELSIF LOWER(unaccent(p_categoria)) ILIKE 'bezerra ao pe' THEN
    SELECT COUNT(*) INTO v_maternidade_count
    FROM registros_maternidade
    WHERE lote_id = p_lote_id AND sexo = 'Fêmea' AND data >= v_date_cutoff AND deleted_at IS NULL;
  ELSE
    v_maternidade_count := 0;
  END IF;

  SELECT COUNT(*) INTO v_morte_count
  FROM registros_morte
  WHERE lote_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  v_quant_atual := v_quant_inicial + v_sum_entradas - v_sum_saidas - v_sum_transf_saida + v_sum_transf_entrada + v_maternidade_count - v_morte_count;

  IF v_quant_atual < 0 THEN
    v_quant_atual := 0;
  END IF;

  RETURN v_quant_atual;
END;
$function$;

-- ============================================================
-- Função aprovar_solicitacao_novo_lote (corrigida)
-- ============================================================
CREATE OR REPLACE FUNCTION public.aprovar_solicitacao_novo_lote(
  p_solicitacao_id uuid,
  p_dados_lote_editado jsonb,
  p_categorias_editadas jsonb,
  p_usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_sol RECORD;
  v_lote_origem RECORD;
  v_fazenda_id uuid;
  v_dados_lote jsonb;
  v_nome_lote text;
  v_pasto_id uuid;
  v_curral_id uuid;
  v_sistema_producao text;
  v_destino text;
  v_novo_lote_id uuid;
  v_novo_lote_nome text;
  v_nome_base text;
  v_sufixo_num int := 0;
  v_total_transferir int := 0;
  v_total_origem int := 0;
  v_is_total boolean;
  v_cat_item jsonb;
  v_categoria text;
  v_cabecas int;
  v_cat_origem RECORD;
  v_mov_ids uuid[] := '{}';
  v_mov_id uuid;
  v_data_mov timestamptz;
  v_lote_created_at timestamptz;
  v_controller RECORD;
  v_result jsonb;
  v_cat_count int;
  v_i int;
BEGIN
  -- 1. Carregar solicitação
  SELECT * INTO v_sol FROM solicitacoes_novo_lote WHERE id = p_solicitacao_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;
  IF v_sol.status <> 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não está pendente (status: ' || v_sol.status || ')');
  END IF;

  v_fazenda_id := v_sol.fazenda_id;

  -- 2. Determinar dados do lote (editado ou proposto)
  v_dados_lote := COALESCE(p_dados_lote_editado, v_sol.dados_lote_proposto);
  v_nome_lote := v_dados_lote->>'nome';
  v_pasto_id := NULLIF(v_dados_lote->>'pasto_id', '')::uuid;
  v_curral_id := NULLIF(v_dados_lote->>'curral_id', '')::uuid;
  v_sistema_producao := v_dados_lote->>'sistema_producao';
  v_destino := v_dados_lote->>'destino';

  IF v_nome_lote IS NULL OR v_nome_lote = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome do lote é obrigatório');
  END IF;

  -- 3. Carregar lote origem
  SELECT * INTO v_lote_origem FROM lotes WHERE id = v_sol.lote_origem_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lote origem não encontrado');
  END IF;

  -- 4. Calcular totais
  v_cat_count := jsonb_array_length(COALESCE(p_categorias_editadas, v_sol.categorias));
  IF v_cat_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhuma categoria informada');
  END IF;

  FOR v_i IN 0..v_cat_count-1 LOOP
    v_cat_item := COALESCE(p_categorias_editadas, v_sol.categorias)->v_i;
    v_cabecas := (v_cat_item->>'numero_cabecas')::int;
    IF v_cabecas IS NULL OR v_cabecas <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cabeças inválidas para categoria: ' || (v_cat_item->>'categoria'));
    END IF;
    v_total_transferir := v_total_transferir + v_cabecas;
  END LOOP;

  SELECT COALESCE(SUM(quant_atual), 0) INTO v_total_origem
  FROM lote_categorias
  WHERE lote_id = v_sol.lote_origem_id AND ativo = true;

  v_is_total := (v_total_transferir >= v_total_origem);

  -- 5. Gerar nome do novo lote (sufixar se colidir)
  v_nome_base := v_nome_lote;
  v_novo_lote_nome := v_nome_base;
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM lotes
      WHERE fazenda_id = v_fazenda_id AND nome = v_novo_lote_nome AND deleted_at IS NULL
    ) THEN
      EXIT;
    END IF;
    v_sufixo_num := v_sufixo_num + 1;
    v_novo_lote_nome := v_nome_base || ' (' || v_sufixo_num::text || ')';
    IF v_sufixo_num > 99 THEN
      v_novo_lote_nome := v_nome_base || ' (' || to_char(now(), 'YYYYMMDDHH24MI') || ')';
      EXIT;
    END IF;
  END LOOP;

  -- 6. Criar lote
  INSERT INTO lotes (
    fazenda_id, nome, n_cabecas, ativo,
    numero_cabecas,
    pasto_id,
    sistema_producao, destino,
    raca, sexo, idade_meses, rc_inicial, preco_kg, preco_cab,
    custo_operacional_reais_cab_dia, estrategia_nutricional,
    produtor_rural, propriedade_origem, numero_contrato, mes_competencia,
    data_liberacao_sisbov, periodo_liberacao_sisbov, data_embarque_previsto,
    quant_inicial, peso_entrada_kg, data_pesagem, data_meta,
    peso_vivo_meta_kg, peso_vivo_kg, peso_entrada_kg_cab, periodo,
    preco_animal_kg, preco_animal_cab, idade,
    dias_restantes_meta, data_embarque_prevista, meta_intervalo_rodeio_dias,
    data_proximo_rodeio, qtd_bezerros, quantidade_bezerros
  ) VALUES (
    v_fazenda_id, v_novo_lote_nome, v_total_transferir, true,
    v_total_transferir,
    CASE WHEN v_sistema_producao = 'Confinamento' THEN NULL ELSE v_pasto_id END,
    v_sistema_producao, v_destino,
    v_lote_origem.raca, v_lote_origem.sexo, v_lote_origem.idade_meses,
    v_lote_origem.rc_inicial, v_lote_origem.preco_kg, v_lote_origem.preco_cab,
    v_lote_origem.custo_operacional_reais_cab_dia, v_lote_origem.estrategia_nutricional,
    v_lote_origem.produtor_rural, v_lote_origem.propriedade_origem,
    v_lote_origem.numero_contrato, v_lote_origem.mes_competencia,
    v_lote_origem.data_liberacao_sisbov, v_lote_origem.periodo_liberacao_sisbov,
    v_lote_origem.data_embarque_previsto,
    v_total_transferir, v_lote_origem.peso_entrada_kg,
    v_lote_origem.data_pesagem, v_lote_origem.data_meta,
    v_lote_origem.peso_vivo_meta_kg, v_lote_origem.peso_vivo_kg,
    v_lote_origem.peso_entrada_kg_cab, v_lote_origem.periodo,
    v_lote_origem.preco_animal_kg, v_lote_origem.preco_animal_cab, v_lote_origem.idade,
    v_lote_origem.dias_restantes_meta, v_lote_origem.data_embarque_prevista,
    v_lote_origem.meta_intervalo_rodeio_dias, v_lote_origem.data_proximo_rodeio,
    v_lote_origem.qtd_bezerros, v_lote_origem.quantidade_bezerros
  )
  RETURNING id, created_at INTO v_novo_lote_id, v_lote_created_at;

  -- 7. Vincular curral se confinamento
  IF v_sistema_producao = 'Confinamento' AND v_curral_id IS NOT NULL THEN
    UPDATE currais SET lote_id = v_novo_lote_id WHERE id = v_curral_id;
  END IF;

  -- 8. Criar lote_categorias (snapshot completo da origem, sem gmd)
  -- quant_inicial = v_cabecas: a categoria nasce com a quantidade movimentada.
  -- quant_atual = v_cabecas: valor inicial; a trigger update_quant_atual_movimentacao
  --   recalcula via calculate_quant_atual, que agora exclui subtipo='Novo Lote'
  --   da soma de transf_entrada, evitando duplicação. Resultado: v_cabecas + 0 = v_cabecas.
  -- transf_entrada = 0 na categoria: a trigger calcula transf_entrada a partir
  --   dos registros_movimentacao, não deste campo.
  -- data_pesagem = data da movimentação
  FOR v_i IN 0..v_cat_count-1 LOOP
    v_cat_item := COALESCE(p_categorias_editadas, v_sol.categorias)->v_i;
    v_categoria := v_cat_item->>'categoria';
    v_cabecas := (v_cat_item->>'numero_cabecas')::int;

    SELECT * INTO v_cat_origem
    FROM lote_categorias
    WHERE lote_id = v_sol.lote_origem_id
      AND LOWER(categoria) = LOWER(v_categoria)
      AND ativo = true;

    INSERT INTO lote_categorias (
      lote_id, categoria, quant_inicial, quant_atual,
      data_pesagem, peso_entrada_kg_cab, peso_entrada_arrobas,
      periodo, rc_inicial,
      peso_vivo_atual_kg_cab, peso_vivo_meta_kg_cab, dias_restantes_meta,
      data_meta_projetada, estrategia_nutricional, raca, sexo, idade, ativo,
      morte, consumo, abate, transf_entrada, transf_saida, qtd_bezerros,
      consumo_meta_porcentagem_pesovivo, rc_final, peso_venda_meta_arroba,
      margem_lucro_percent, preco_custo_reais_arroba, preco_custo_cab,
      preco_venda_projetado_reais_arroba, preco_venda_sugerido_cab, rc_atual,
      peso_vivo_atual_arroba_cab, producao_atual_arroba_cab, producao_projetada_arroba_cab,
      preco_entrada_reais_arroba, faturamento_projetado_reais_lote_categoria,
      venda_total_arroba_lote_categoria, agio_percent, custo_frete_reais_cab,
      custo_comissao_reais_cab, custo_sanidade_reais_cab,
      custo_identificacao_rastreabilidade_reais_cab, custo_total_entrada_reais_cab,
      custo_total_entrada_reais_lote, preco_entrada_reais_kg, preco_entrada_reais_cab,
      custo_operacional_reais_cab_dia
    ) VALUES (
      v_novo_lote_id, v_categoria, v_cabecas, v_cabecas,
      NULLIF(v_cat_item->>'data_pesagem', '')::date,
      NULLIF(v_cat_item->>'peso_entrada_kg_cab', '')::numeric,
      NULLIF(v_cat_item->>'peso_entrada_arrobas', '')::numeric,
      NULLIF(v_cat_item->>'periodo', '')::int,
      NULLIF(v_cat_item->>'rc_inicial', '')::numeric,
      NULLIF(v_cat_item->>'peso_vivo_atual_kg_cab', '')::numeric,
      NULLIF(v_cat_item->>'peso_vivo_meta_kg_cab', '')::numeric,
      NULLIF(v_cat_item->>'dias_restantes_meta', '')::int,
      NULLIF(v_cat_item->>'data_meta_projetada', '')::date,
      NULLIF(v_cat_item->>'estrategia_nutricional', ''),
      NULLIF(v_cat_item->>'raca', ''),
      NULLIF(v_cat_item->>'sexo', ''),
      NULLIF(v_cat_item->>'idade', '')::int,
      true,
      0, 0, 0, 0, 0,
      NULLIF(v_cat_item->>'qtd_bezerros', '')::int,
      NULLIF(v_cat_item->>'consumo_meta_porcentagem_pesovivo', '')::numeric,
      NULLIF(v_cat_item->>'rc_final', '')::numeric,
      NULLIF(v_cat_item->>'peso_venda_meta_arroba', '')::numeric,
      NULLIF(v_cat_item->>'margem_lucro_percent', '')::numeric,
      NULLIF(v_cat_item->>'preco_custo_reais_arroba', '')::numeric,
      NULLIF(v_cat_item->>'preco_custo_cab', '')::numeric,
      NULLIF(v_cat_item->>'preco_venda_projetado_reais_arroba', '')::numeric,
      NULLIF(v_cat_item->>'preco_venda_sugerido_cab', '')::numeric,
      NULLIF(v_cat_item->>'rc_atual', '')::numeric,
      NULLIF(v_cat_item->>'peso_vivo_atual_arroba_cab', '')::numeric,
      NULLIF(v_cat_item->>'producao_atual_arroba_cab', '')::numeric,
      NULLIF(v_cat_item->>'producao_projetada_arroba_cab', '')::numeric,
      NULLIF(v_cat_item->>'preco_entrada_reais_arroba', '')::numeric,
      NULLIF(v_cat_item->>'faturamento_projetado_reais_lote_categoria', '')::numeric,
      NULLIF(v_cat_item->>'venda_total_arroba_lote_categoria', '')::numeric,
      NULLIF(v_cat_item->>'agio_percent', '')::numeric,
      NULLIF(v_cat_item->>'custo_frete_reais_cab', '')::numeric,
      NULLIF(v_cat_item->>'custo_comissao_reais_cab', '')::numeric,
      NULLIF(v_cat_item->>'custo_sanidade_reais_cab', '')::numeric,
      NULLIF(v_cat_item->>'custo_identificacao_rastreabilidade_reais_cab', '')::numeric,
      NULLIF(v_cat_item->>'custo_total_entrada_reais_cab', '')::numeric,
      NULLIF(v_cat_item->>'custo_total_entrada_reais_lote', '')::numeric,
      NULLIF(v_cat_item->>'preco_entrada_reais_kg', '')::numeric,
      NULLIF(v_cat_item->>'preco_entrada_reais_cab', '')::numeric,
      NULLIF(v_cat_item->>'custo_operacional_reais_cab_dia', '')::numeric
    );
  END LOOP;

  -- 9. Criar registros_movimentacao (1s após criação do lote)
  v_data_mov := v_lote_created_at + interval '1 second';

  FOR v_i IN 0..v_cat_count-1 LOOP
    v_cat_item := COALESCE(p_categorias_editadas, v_sol.categorias)->v_i;
    v_categoria := v_cat_item->>'categoria';
    v_cabecas := (v_cat_item->>'numero_cabecas')::int;

    INSERT INTO registros_movimentacao (
      fazenda_id, data, lote_origem, lote_origem_id,
      destino, lote_destino_id, numero_cabecas, categoria,
      motivo_movimentacao, subtipo, causa_observacao,
      responsavel, nome_usuario, sync_status, version,
      created_at, updated_at
    ) VALUES (
      v_fazenda_id,
      v_data_mov,
      v_sol.lote_origem_nome,
      v_sol.lote_origem_id,
      v_novo_lote_nome,
      v_novo_lote_id,
      v_cabecas,
      v_categoria,
      'Saída'::tipo_movimentacao_motivo,
      'Novo Lote'::tipo_movimentacao_subtipo,
      v_sol.dados_movimentacao->>'causa_observacao',
      v_sol.dados_movimentacao->>'usuario',
      v_sol.dados_movimentacao->>'usuario',
      'synced',
      1,
      v_data_mov,
      v_data_mov
    )
    RETURNING id INTO v_mov_id;

    v_mov_ids := array_append(v_mov_ids, v_mov_id);
  END LOOP;

  -- 10. Ajustar lote origem
  -- A trigger update_quant_atual_movimentacao já recalculou quant_atual via
  --   calculate_quant_atual, que subtrai as saídas corretamente quando
  --   quant_inicial está definido. Apenas incrementamos transf_saida
  --   para auditoria. Não subtraímos v_cabecas novamente para evitar
  --   dupla subtração.
  IF v_is_total THEN
    UPDATE lotes SET ativo = false, n_cabecas = 0, numero_cabecas = 0, updated_at = now()
    WHERE id = v_sol.lote_origem_id;
    UPDATE lote_categorias SET ativo = false, quant_atual = 0, updated_at = now()
    WHERE lote_id = v_sol.lote_origem_id AND ativo = true;
  ELSE
    FOR v_i IN 0..v_cat_count-1 LOOP
      v_cat_item := COALESCE(p_categorias_editadas, v_sol.categorias)->v_i;
      v_categoria := v_cat_item->>'categoria';
      v_cabecas := (v_cat_item->>'numero_cabecas')::int;
      UPDATE lote_categorias
      SET transf_saida = transf_saida + v_cabecas,
          updated_at = now()
      WHERE lote_id = v_sol.lote_origem_id
        AND LOWER(categoria) = LOWER(v_categoria)
        AND ativo = true;
    END LOOP;
    UPDATE lotes
    SET n_cabecas = GREATEST(COALESCE(n_cabecas, 0) - v_total_transferir, 0),
        numero_cabecas = GREATEST(COALESCE(numero_cabecas, 0) - v_total_transferir, 0),
        updated_at = now()
    WHERE id = v_sol.lote_origem_id;
  END IF;

  -- 11. Atualizar solicitação
  UPDATE solicitacoes_novo_lote
  SET status = 'aprovada',
      aprovada_at = now(),
      aprovada_by = p_usuario_id,
      lote_criado_id = v_novo_lote_id,
      movimentacao_criada_ids = v_mov_ids,
      dados_lote_editado = p_dados_lote_editado,
      categorias_editadas = p_categorias_editadas,
      updated_at = now()
  WHERE id = p_solicitacao_id;

  -- 12. Notificar controllers
  FOR v_controller IN
    SELECT u.id FROM usuarios u
    JOIN usuario_fazenda uf ON u.id = uf.usuario_id
    WHERE uf.fazenda_id = v_fazenda_id
      AND uf.ativo = true
      AND uf.papel IN ('admin', 'controller')
      AND (u.id)::text NOT LIKE '%@gestaup.internal'
      AND u.ativo = true
  LOOP
    INSERT INTO notificacoes (usuario_id, fazenda_id, tipo, titulo, mensagem, acao_url, acao_label, dados_jsonb)
    VALUES (
      v_controller.id,
      v_fazenda_id,
      'success',
      'Lote criado por aprovação: ' || v_novo_lote_nome,
      'Lote "' || v_novo_lote_nome || '" criado a partir do lote "' || v_sol.lote_origem_nome || '". Total: ' || v_total_transferir || ' cabeças.',
      '/controller/lotes',
      'Ver lotes',
      jsonb_build_object(
        'tipo_solicitacao', 'novo_lote_aprovado',
        'solicitacao_id', p_solicitacao_id,
        'lote_criado_id', v_novo_lote_id,
        'lote_nome', v_novo_lote_nome
      )
    );
  END LOOP;

  v_result := jsonb_build_object(
    'success', true,
    'lote_criado_id', v_novo_lote_id,
    'lote_criado_nome', v_novo_lote_nome,
    'movimentacao_ids', v_mov_ids,
    'total_cabecas', v_total_transferir,
    'transferencia_total', v_is_total
  );

  RETURN v_result;
END;
$function$;

-- Grants (reatribuir pois CREATE OR REPLACE pode resetar)
GRANT EXECUTE ON FUNCTION public.aprovar_solicitacao_novo_lote(uuid, jsonb, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rejeitar_solicitacao_novo_lote(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_solicitacao_novo_lote() TO authenticated;

-- Grants de tabela (faltavam INSERT/SELECT/UPDATE para authenticated)
GRANT INSERT, SELECT, UPDATE ON public.solicitacoes_novo_lote TO authenticated;
GRANT SELECT ON public.solicitacoes_novo_lote TO anon;
