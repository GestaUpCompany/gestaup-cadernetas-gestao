
-- Fase 4: Alertas e Notificações

-- 1. Função para gerar notificações de ocupação
CREATE OR REPLACE FUNCTION public.gerar_notificacao_ocupacao(
  p_fazenda_id uuid,
  p_lote_id uuid,
  p_lote_nome text,
  p_pasto_id uuid,
  p_pasto_nome text,
  p_modulo_id uuid,
  p_modulo_nome text,
  p_tipo text, -- 'pasto' ou 'modulo'
  p_dias_ocupacao numeric,
  p_meta_dias integer,
  p_desvio_percentual numeric,
  p_acao_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usuario_id uuid;
  v_titulo text;
  v_mensagem text;
  v_acao_label text;
  v_notificacao_existente_id uuid;
BEGIN
  -- Só gera notificação se meta estiver definida e excedida
  IF p_meta_dias IS NULL OR p_dias_ocupacao <= p_meta_dias THEN
    RETURN;
  END IF;

  -- Montar título e mensagem
  IF p_tipo = 'pasto' THEN
    v_titulo := 'Meta de ocupação excedida no pasto';
    v_mensagem := format(
      'O lote %s está no pasto %s há %s dias, excedendo a meta de %s dias (desvio: %s%%).',
      COALESCE(p_lote_nome, ''), COALESCE(p_pasto_nome, ''),
      ROUND(p_dias_ocupacao, 1), p_meta_dias,
      COALESCE(ROUND(p_desvio_percentual, 1)::text, 'N/A')
    );
    v_acao_label := 'Ver pasto';
  ELSIF p_tipo = 'modulo' THEN
    v_titulo := 'Meta de ocupação excedida no módulo';
    v_mensagem := format(
      'O lote %s está no módulo %s há %s dias, excedendo a meta de %s dias (desvio: %s%%).',
      COALESCE(p_lote_nome, ''), COALESCE(p_modulo_nome, ''),
      ROUND(p_dias_ocupacao, 1), p_meta_dias,
      COALESCE(ROUND(p_desvio_percentual, 1)::text, 'N/A')
    );
    v_acao_label := 'Ver módulo';
  ELSE
    RETURN;
  END IF;

  -- Criar notificação para cada usuário vinculado à fazenda
  FOR v_usuario_id IN
    SELECT usuario_id
    FROM public.usuario_fazenda
    WHERE fazenda_id = p_fazenda_id
      AND ativo = true
  LOOP
    -- Verificar se já existe notificação não lida para este evento
    SELECT id INTO v_notificacao_existente_id
    FROM public.notificacoes
    WHERE usuario_id = v_usuario_id
      AND fazenda_id = p_fazenda_id
      AND tipo = 'warning'
      AND mensagem = v_mensagem
      AND lida = false
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_notificacao_existente_id IS NULL THEN
      INSERT INTO public.notificacoes (
        usuario_id, fazenda_id, tipo, titulo, mensagem,
        acao_url, acao_label, lida, created_at, updated_at
      )
      VALUES (
        v_usuario_id, p_fazenda_id, 'warning', v_titulo, v_mensagem,
        p_acao_url, v_acao_label, false, now(), now()
      );
    END IF;
  END LOOP;
END;
$$;

-- 2. Atualizar função de movimentação para gerar notificações
CREATE OR REPLACE FUNCTION public.processar_movimentacao_pastagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lote_id uuid;
  v_pasto_entrada_id uuid;
  v_pasto_saida_id uuid;
  v_modulo_entrada_id uuid;
  v_modulo_saida_id uuid;
  v_cabecas_atual integer;
  v_peso_atual numeric;
  v_meta_pasto integer;
  v_meta_modulo integer;
  v_historico_pasto_fechado_id uuid;
  v_dias_ocupacao numeric;
  v_desvio numeric;
  v_historico_modulo_aberto_id uuid;
  v_historico_modulo_aberto_modulo_id uuid;
  v_lote_nome text;
  v_pasto_nome text;
  v_modulo_nome text;
  v_pasto_saida_nome text;
  v_modulo_saida_nome text;
  v_novo_historico_pasto_id uuid;
  v_novo_historico_modulo_id uuid;
BEGIN
  -- Determinar lote_id (prioriza ID, fallback para nome do pasto de saída)
  v_lote_id := NEW.lote_id;

  IF v_lote_id IS NULL THEN
    IF NEW.pasto_saida_id IS NOT NULL THEN
      SELECT l.id INTO v_lote_id
      FROM public.lotes l
      WHERE l.pasto_id = NEW.pasto_saida_id AND l.fazenda_id = NEW.fazenda_id
      LIMIT 1;
    ELSE
      SELECT l.id INTO v_lote_id
      FROM public.lotes l
      JOIN public.pastos p ON l.pasto_id = p.id
      WHERE p.fazenda_id = NEW.fazenda_id AND p.nome = NEW.pasto_saida
      LIMIT 1;
    END IF;
  END IF;

  -- Determinar pasto de entrada
  IF NEW.pasto_entrada_id IS NOT NULL THEN
    v_pasto_entrada_id := NEW.pasto_entrada_id;
  ELSE
    SELECT id INTO v_pasto_entrada_id
    FROM public.pastos
    WHERE fazenda_id = NEW.fazenda_id AND nome = NEW.pasto_entrada
    LIMIT 1;
  END IF;

  -- Determinar pasto de saída
  IF NEW.pasto_saida_id IS NOT NULL THEN
    v_pasto_saida_id := NEW.pasto_saida_id;
  ELSE
    SELECT id INTO v_pasto_saida_id
    FROM public.pastos
    WHERE fazenda_id = NEW.fazenda_id AND nome = NEW.pasto_saida
    LIMIT 1;
  END IF;

  -- Se não achou lote ou pasto de entrada, não faz nada
  IF v_lote_id IS NULL OR v_pasto_entrada_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar nomes e módulos
  SELECT nome, modulo_id INTO v_pasto_nome, v_modulo_entrada_id
  FROM public.pastos WHERE id = v_pasto_entrada_id;
  
  SELECT nome, modulo_id INTO v_pasto_saida_nome, v_modulo_saida_id
  FROM public.pastos WHERE id = v_pasto_saida_id;
  
  SELECT nome INTO v_lote_nome FROM public.lotes WHERE id = v_lote_id;
  SELECT nome INTO v_modulo_nome FROM public.modulos_pastos WHERE id = v_modulo_entrada_id;
  SELECT nome INTO v_modulo_saida_nome FROM public.modulos_pastos WHERE id = v_modulo_saida_id;

  -- Buscar métricas atuais do lote
  v_cabecas_atual := public.calcular_cabecas_lote(v_lote_id);
  v_peso_atual := public.calcular_peso_medio_lote(v_lote_id);

  -- Buscar metas
  SELECT meta_intervalo_ocupacao_dias INTO v_meta_pasto
  FROM public.pastos WHERE id = v_pasto_entrada_id;
  SELECT meta_intervalo_ocupacao_dias INTO v_meta_modulo
  FROM public.modulos_pastos WHERE id = v_modulo_entrada_id;

  -- 1. Fechar histórico de pasto aberto (se existir)
  UPDATE public.lote_pasto_historico
  SET 
    data_hora_saida = NEW.data,
    cabecas_saida = v_cabecas_atual,
    peso_vivo_medio_saida_kg = v_peso_atual,
    desvio_tempo_ocupacao_percent = CASE
      WHEN meta_intervalo_ocupacao_dias IS NOT NULL AND meta_intervalo_ocupacao_dias > 0 THEN
        ROUND(
          ((EXTRACT(EPOCH FROM (NEW.data - data_hora_entrada)) / 86400.0 - meta_intervalo_ocupacao_dias)
          / meta_intervalo_ocupacao_dias * 100)::numeric, 2
        )
      ELSE NULL
    END,
    updated_at = now()
  WHERE lote_id = v_lote_id AND data_hora_saida IS NULL
  RETURNING id INTO v_historico_pasto_fechado_id;

  -- 2. Atualizar lote para o novo pasto e módulo
  UPDATE public.lotes
  SET pasto_id = v_pasto_entrada_id,
      modulo_id = v_modulo_entrada_id,
      updated_at = now()
  WHERE id = v_lote_id;

  -- 3. Atualizar individuos
  UPDATE public.individuos
  SET pasto_atual = v_pasto_entrada_id,
      updated_at = now()
  WHERE fazenda_id = NEW.fazenda_id AND lote_atual = v_lote_id;

  -- 4. Abrir novo histórico de pasto
  INSERT INTO public.lote_pasto_historico (
    lote_id, pasto_id, data_hora_entrada, data_hora_saida,
    cabecas_entrada, peso_vivo_medio_entrada_kg,
    modulo_id, meta_intervalo_ocupacao_dias,
    created_at, updated_at
  )
  VALUES (
    v_lote_id, v_pasto_entrada_id, NEW.data, NULL,
    v_cabecas_atual, v_peso_atual,
    v_modulo_entrada_id, v_meta_pasto,
    now(), now()
  )
  RETURNING id INTO v_novo_historico_pasto_id;

  -- 5. Gerenciar histórico de módulo
  IF v_modulo_entrada_id IS NOT NULL THEN
    -- Verificar se já existe histórico de módulo aberto para este lote
    SELECT id, modulo_id
    INTO v_historico_modulo_aberto_id, v_historico_modulo_aberto_modulo_id
    FROM public.lote_modulo_historico
    WHERE lote_id = v_lote_id AND data_hora_saida IS NULL
    LIMIT 1;

    IF v_historico_modulo_aberto_id IS NULL THEN
      -- Primeiro pasto do módulo: abrir histórico
      INSERT INTO public.lote_modulo_historico (
        lote_id, modulo_id, data_hora_entrada,
        cabecas_entrada, peso_vivo_medio_entrada_kg,
        meta_intervalo_ocupacao_dias,
        created_at, updated_at
      )
      VALUES (
        v_lote_id, v_modulo_entrada_id, NEW.data,
        v_cabecas_atual, v_peso_atual,
        v_meta_modulo,
        now(), now()
      )
      RETURNING id INTO v_novo_historico_modulo_id;
    ELSIF v_historico_modulo_aberto_modulo_id <> v_modulo_entrada_id THEN
      -- Lote mudou de módulo: fechar antigo e abrir novo
      UPDATE public.lote_modulo_historico
      SET 
        data_hora_saida = NEW.data,
        cabecas_saida = v_cabecas_atual,
        peso_vivo_medio_saida_kg = v_peso_atual,
        desvio_tempo_ocupacao_percent = CASE
          WHEN meta_intervalo_ocupacao_dias IS NOT NULL AND meta_intervalo_ocupacao_dias > 0 THEN
            ROUND(
              ((EXTRACT(EPOCH FROM (NEW.data - data_hora_entrada)) / 86400.0 - meta_intervalo_ocupacao_dias)
              / meta_intervalo_ocupacao_dias * 100)::numeric, 2
            )
          ELSE NULL
        END,
        updated_at = now()
      WHERE id = v_historico_modulo_aberto_id;

      INSERT INTO public.lote_modulo_historico (
        lote_id, modulo_id, data_hora_entrada,
        cabecas_entrada, peso_vivo_medio_entrada_kg,
        meta_intervalo_ocupacao_dias,
        created_at, updated_at
      )
      VALUES (
        v_lote_id, v_modulo_entrada_id, NEW.data,
        v_cabecas_atual, v_peso_atual,
        v_meta_modulo,
        now(), now()
      )
      RETURNING id INTO v_novo_historico_modulo_id;
    END IF;
  ELSE
    -- Lote entrou em pasto sem módulo: fechar qualquer histórico de módulo aberto
    SELECT id INTO v_historico_modulo_aberto_id
    FROM public.lote_modulo_historico
    WHERE lote_id = v_lote_id AND data_hora_saida IS NULL
    LIMIT 1;

    IF v_historico_modulo_aberto_id IS NOT NULL THEN
      UPDATE public.lote_modulo_historico
      SET 
        data_hora_saida = NEW.data,
        cabecas_saida = v_cabecas_atual,
        peso_vivo_medio_saida_kg = v_peso_atual,
        desvio_tempo_ocupacao_percent = CASE
          WHEN meta_intervalo_ocupacao_dias IS NOT NULL AND meta_intervalo_ocupacao_dias > 0 THEN
            ROUND(
              ((EXTRACT(EPOCH FROM (NEW.data - data_hora_entrada)) / 86400.0 - meta_intervalo_ocupacao_dias)
              / meta_intervalo_ocupacao_dias * 100)::numeric, 2
            )
          ELSE NULL
        END,
        updated_at = now()
      WHERE id = v_historico_modulo_aberto_id;
    END IF;
  END IF;

  -- 6. Verificar alertas de meta excedida para ocupações retroativas
  IF v_meta_pasto IS NOT NULL THEN
    v_dias_ocupacao := EXTRACT(EPOCH FROM (now() - NEW.data)) / 86400.0;
    IF v_dias_ocupacao > v_meta_pasto THEN
      v_desvio := ((v_dias_ocupacao - v_meta_pasto) / v_meta_pasto * 100)::numeric;
      PERFORM public.gerar_notificacao_ocupacao(
        NEW.fazenda_id, v_lote_id, v_lote_nome,
        v_pasto_entrada_id, v_pasto_nome,
        NULL, NULL,
        'pasto', v_dias_ocupacao, v_meta_pasto, v_desvio,
        '/controller/pastos'
      );
    END IF;
  END IF;

  IF v_novo_historico_modulo_id IS NOT NULL AND v_meta_modulo IS NOT NULL THEN
    v_dias_ocupacao := EXTRACT(EPOCH FROM (now() - NEW.data)) / 86400.0;
    IF v_dias_ocupacao > v_meta_modulo THEN
      v_desvio := ((v_dias_ocupacao - v_meta_modulo) / v_meta_modulo * 100)::numeric;
      PERFORM public.gerar_notificacao_ocupacao(
        NEW.fazenda_id, v_lote_id, v_lote_nome,
        NULL, NULL,
        v_modulo_entrada_id, v_modulo_nome,
        'modulo', v_dias_ocupacao, v_meta_modulo, v_desvio,
        '/controller/modulos-pastos'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Função para verificação diária de ocupações acima da meta
CREATE OR REPLACE FUNCTION public.verificar_ocupacoes_acima_meta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
  v_dias_ocupacao numeric;
  v_desvio numeric;
  v_lote_nome text;
  v_pasto_nome text;
  v_modulo_nome text;
BEGIN
  -- Verificar ocupações de pasto acima da meta
  FOR r IN
    SELECT 
      h.id as historico_id,
      h.lote_id,
      h.pasto_id,
      h.modulo_id,
      h.data_hora_entrada,
      h.meta_intervalo_ocupacao_dias,
      l.fazenda_id
    FROM public.lote_pasto_historico h
    JOIN public.lotes l ON h.lote_id = l.id
    WHERE h.data_hora_saida IS NULL
      AND h.meta_intervalo_ocupacao_dias IS NOT NULL
  LOOP
    v_dias_ocupacao := EXTRACT(EPOCH FROM (now() - r.data_hora_entrada)) / 86400.0;
    IF v_dias_ocupacao > r.meta_intervalo_ocupacao_dias THEN
      v_desvio := ((v_dias_ocupacao - r.meta_intervalo_ocupacao_dias) / r.meta_intervalo_ocupacao_dias * 100)::numeric;
      SELECT nome INTO v_lote_nome FROM public.lotes WHERE id = r.lote_id;
      SELECT nome INTO v_pasto_nome FROM public.pastos WHERE id = r.pasto_id;
      
      PERFORM public.gerar_notificacao_ocupacao(
        r.fazenda_id, r.lote_id, v_lote_nome,
        r.pasto_id, v_pasto_nome,
        NULL, NULL,
        'pasto', v_dias_ocupacao, r.meta_intervalo_ocupacao_dias, v_desvio,
        '/controller/pastos'
      );
    END IF;
  END LOOP;

  -- Verificar ocupações de módulo acima da meta
  FOR r IN
    SELECT 
      h.id as historico_id,
      h.lote_id,
      h.modulo_id,
      h.data_hora_entrada,
      h.meta_intervalo_ocupacao_dias,
      l.fazenda_id
    FROM public.lote_modulo_historico h
    JOIN public.lotes l ON h.lote_id = l.id
    WHERE h.data_hora_saida IS NULL
      AND h.meta_intervalo_ocupacao_dias IS NOT NULL
  LOOP
    v_dias_ocupacao := EXTRACT(EPOCH FROM (now() - r.data_hora_entrada)) / 86400.0;
    IF v_dias_ocupacao > r.meta_intervalo_ocupacao_dias THEN
      v_desvio := ((v_dias_ocupacao - r.meta_intervalo_ocupacao_dias) / r.meta_intervalo_ocupacao_dias * 100)::numeric;
      SELECT nome INTO v_lote_nome FROM public.lotes WHERE id = r.lote_id;
      SELECT nome INTO v_modulo_nome FROM public.modulos_pastos WHERE id = r.modulo_id;
      
      PERFORM public.gerar_notificacao_ocupacao(
        r.fazenda_id, r.lote_id, v_lote_nome,
        NULL, NULL,
        r.modulo_id, v_modulo_nome,
        'modulo', v_dias_ocupacao, r.meta_intervalo_ocupacao_dias, v_desvio,
        '/controller/modulos-pastos'
      );
    END IF;
  END LOOP;
END;
$$;
;
