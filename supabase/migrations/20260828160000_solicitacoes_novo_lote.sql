-- ============================================================
-- Solicitações de Novo Lote (Saída com criação pendente de aprovação)
-- ============================================================
-- Fluxo: peão registra Saída → Novo Lote no PWA (offline-first).
-- A solicitação fica pendente na tabela solicitacoes_novo_lote.
-- O Painel Web exibe um card em Lotes.tsx; o controller revisa,
-- edita dados do lote e categorias, e aprova ou rejeita.
-- Na aprovação, a RPC cria o lote primeiro, depois as movimentações
-- com created_at/data 1s à frente, e ajusta o lote origem.
-- Na rejeição, o registro no PWA é marcado como rejeitado via polling.
-- ============================================================

-- ============================================================
-- PARTE 1: Adicionar 'Novo Lote' ao enum tipo_movimentacao_subtipo
-- ============================================================
ALTER TYPE public.tipo_movimentacao_subtipo ADD VALUE IF NOT EXISTS 'Novo Lote';

-- ============================================================
-- PARTE 2: Tabela solicitacoes_novo_lote
-- ============================================================
CREATE TABLE solicitacoes_novo_lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  lote_origem_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  lote_origem_nome TEXT NOT NULL,
  dados_lote_proposto JSONB NOT NULL,
    -- {nome, pasto_id, curral_id, sistema_producao, destino}
  dados_lote_editado JSONB,
    -- versão editada pelo controller na aprovação; NULL se não editado
  categorias JSONB NOT NULL,
    -- [{categoria, numero_cabecas, raca, sexo, idade, data_pesagem,
    --   quant_inicial, quant_atual, peso_entrada_kg_cab, peso_vivo_atual_kg_cab,
    --   peso_entrada_arrobas, rc_inicial, peso_vivo_meta_kg_cab, ...snapshot completo sem gmd}]
  categorias_editadas JSONB,
    -- versão editada pelo controller; NULL se não editado
  dados_movimentacao JSONB NOT NULL,
    -- {data, usuario, motivo, subtipo, causa_observacao}
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  dispositivo_id TEXT,
  app_version TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  aprovada_at TIMESTAMPTZ,
  aprovada_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  rejeitada_at TIMESTAMPTZ,
  rejeitada_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo_rejeicao TEXT,
  lote_criado_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  movimentacao_criada_ids UUID[]
);

CREATE INDEX idx_solicitacoes_novo_lote_fazenda ON solicitacoes_novo_lote(fazenda_id);
CREATE INDEX idx_solicitacoes_novo_lote_status ON solicitacoes_novo_lote(status);
CREATE INDEX idx_solicitacoes_novo_lote_origem ON solicitacoes_novo_lote(lote_origem_id);
CREATE INDEX idx_solicitacoes_novo_lote_created ON solicitacoes_novo_lote(created_at DESC);

-- ============================================================
-- PARTE 3: RLS
-- ============================================================
ALTER TABLE solicitacoes_novo_lote ENABLE ROW LEVEL SECURITY;

-- Peão (PWA) pode INSERT na própria fazenda
CREATE POLICY "solicitacoes_novo_lote_insert" ON solicitacoes_novo_lote
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_peao_fazenda_id() = fazenda_id
    OR public.user_has_fazenda_access(fazenda_id)
  );

-- Controllers/Admin (Painel Web) podem SELECT da sua fazenda
CREATE POLICY "solicitacoes_novo_lote_select" ON solicitacoes_novo_lote
  FOR SELECT TO authenticated
  USING (
    public.get_peao_fazenda_id() = fazenda_id
    OR public.user_has_fazenda_access(fazenda_id)
  );

-- Controllers/Admin podem UPDATE (aprovar/rejeitar) da sua fazenda
CREATE POLICY "solicitacoes_novo_lote_update" ON solicitacoes_novo_lote
  FOR UPDATE TO authenticated
  USING (public.user_has_fazenda_access(fazenda_id))
  WITH CHECK (public.user_has_fazenda_access(fazenda_id));

-- Peão pode UPDATE apenas do status (para polling via RPC, não direto)
-- O polling é feito via SELECT, não UPDATE, então não precisamos de policy de peão UPDATE.

-- ============================================================
-- PARTE 4: Trigger de notificação ao chegar solicitação
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

CREATE TRIGGER trg_notify_solicitacao_novo_lote
  AFTER INSERT ON solicitacoes_novo_lote
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_solicitacao_novo_lote();

-- ============================================================
-- PARTE 5: RPC aprovar_solicitacao_novo_lote
-- ============================================================
-- Cria o lote primeiro, depois as movimentações com created_at 1s à frente,
-- ajusta o lote origem (parcial/total), e marca a solicitação como aprovada.
-- SECURITY DEFINER: bypassa RLS (controller tem acesso, mas a RPC garante atomicidade).
CREATE OR REPLACE FUNCTION public.aprovar_solicitacao_novo_lote(
  p_solicitacao_id uuid,
  p_dados_lote_editado jsonb,      -- campos editados do lote
  p_categorias_editadas jsonb,     -- categorias editadas (snapshot completo sem gmd)
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
  -- Se sistema_producao = 'Confinamento', pasto_id = NULL; senão curral_id = NULL
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
  -- quant_inicial = 0, quant_atual = 0: a trigger update_quant_atual_movimentacao
  --   recalcula quant_atual = quant_inicial + sum(transf_entrada de movimentações)
  --   = 0 + v_cabecas = v_cabecas. Se definíssemos quant_inicial = v_cabecas,
  --   a trigger somaria novamente e resultaria em 2x o valor.
  -- transf_entrada = 0 na categoria: a trigger calcula transf_entrada a partir
  --   dos registros_movimentacao, não deste campo.
  -- data_pesagem = data da movimentação
  -- formulacao_id = NULL, data_ajuste_peso = NULL
  FOR v_i IN 0..v_cat_count-1 LOOP
    v_cat_item := COALESCE(p_categorias_editadas, v_sol.categorias)->v_i;
    v_categoria := v_cat_item->>'categoria';
    v_cabecas := (v_cat_item->>'numero_cabecas')::int;

    -- Buscar categoria origem para snapshot
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
      v_novo_lote_id, v_categoria, 0, 0,
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
  -- A trigger update_quant_atual_movimentacao já recalculou quant_atual
  --   do lote origem via calculate_quant_atual (desconta Saída com tipo_saida NULL).
  --   Não subtrair v_cabecas de quant_atual aqui (seria duplo desconto).
  --   Apenas incrementar transf_saida para auditoria e ajustar n_cabecas do lote.
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

-- ============================================================
-- PARTE 6: RPC rejeitar_solicitacao_novo_lote
-- ============================================================
CREATE OR REPLACE FUNCTION public.rejeitar_solicitacao_novo_lote(
  p_solicitacao_id uuid,
  p_motivo text,
  p_usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_sol RECORD;
BEGIN
  SELECT * INTO v_sol FROM solicitacoes_novo_lote WHERE id = p_solicitacao_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;
  IF v_sol.status <> 'pendente' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não está pendente (status: ' || v_sol.status || ')');
  END IF;

  UPDATE solicitacoes_novo_lote
  SET status = 'rejeitada',
      rejeitada_at = now(),
      rejeitada_by = p_usuario_id,
      motivo_rejeicao = NULLIF(TRIM(COALESCE(p_motivo, '')), ''),
      updated_at = now()
  WHERE id = p_solicitacao_id;

  RETURN jsonb_build_object('success', true, 'solicitacao_id', p_solicitacao_id);
END;
$function$;

-- Grants
GRANT EXECUTE ON FUNCTION public.aprovar_solicitacao_novo_lote(uuid, jsonb, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rejeitar_solicitacao_novo_lote(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_solicitacao_novo_lote() TO authenticated;
