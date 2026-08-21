
-- Fase 2: Lógica de movimentação no banco de dados

-- 1. Função auxiliar: calcular peso vivo médio ponderado do lote
CREATE OR REPLACE FUNCTION public.calcular_peso_medio_lote(p_lote_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_peso numeric;
BEGIN
  SELECT 
    SUM(c.quant_atual * c.peso_vivo_atual_kg_cab) / NULLIF(SUM(c.quant_atual), 0)
  INTO v_peso
  FROM public.lote_categorias c
  WHERE c.lote_id = p_lote_id
    AND c.quant_atual > 0
    AND c.peso_vivo_atual_kg_cab IS NOT NULL;

  RETURN v_peso;
END;
$$;

-- 2. Função auxiliar: calcular número de cabeças do lote
CREATE OR REPLACE FUNCTION public.calcular_cabecas_lote(p_lote_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cabecas integer;
BEGIN
  SELECT SUM(c.quant_atual)
  INTO v_cabecas
  FROM public.lote_categorias c
  WHERE c.lote_id = p_lote_id;

  RETURN v_cabecas;
END;
$$;

-- 3. Função principal: processar movimentação de pastagem
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

  -- Buscar módulos dos pastos
  SELECT modulo_id INTO v_modulo_entrada_id FROM public.pastos WHERE id = v_pasto_entrada_id;
  SELECT modulo_id INTO v_modulo_saida_id FROM public.pastos WHERE id = v_pasto_saida_id;

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
  );

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
      );
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
      );
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

  RETURN NEW;
END;
$$;

-- 4. Atualizar trigger para chamar a função principal
DROP TRIGGER IF EXISTS trg_registros_pastagens_mover_lote ON public.registros_pastagens;

CREATE TRIGGER trg_registros_pastagens_mover_lote
  AFTER INSERT ON public.registros_pastagens
  FOR EACH ROW
  EXECUTE FUNCTION public.processar_movimentacao_pastagem();

-- 5. Trigger de proteção: impedir DELETE em lote_pasto_historico
CREATE OR REPLACE FUNCTION public.proteger_lote_pasto_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Não é permitido excluir registros de lote_pasto_historico. Use correção auditada se necessário.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_lote_pasto_historico_delete ON public.lote_pasto_historico;
CREATE TRIGGER trg_proteger_lote_pasto_historico_delete
  BEFORE DELETE ON public.lote_pasto_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_lote_pasto_historico();

-- 6. Trigger de proteção: limitar UPDATE em lote_pasto_historico
CREATE OR REPLACE FUNCTION public.proteger_lote_pasto_historico_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se apenas campos permitidos estão sendo alterados
  IF (
    OLD.id IS DISTINCT FROM NEW.id OR
    OLD.lote_id IS DISTINCT FROM NEW.lote_id OR
    OLD.pasto_id IS DISTINCT FROM NEW.pasto_id OR
    OLD.data_hora_entrada IS DISTINCT FROM NEW.data_hora_entrada OR
    OLD.cabecas_entrada IS DISTINCT FROM NEW.cabecas_entrada OR
    OLD.peso_vivo_medio_entrada_kg IS DISTINCT FROM NEW.peso_vivo_medio_entrada_kg OR
    OLD.modulo_id IS DISTINCT FROM NEW.modulo_id OR
    OLD.meta_intervalo_ocupacao_dias IS DISTINCT FROM NEW.meta_intervalo_ocupacao_dias OR
    OLD.created_at IS DISTINCT FROM NEW.created_at
  ) THEN
    RAISE EXCEPTION 'Não é permitido alterar campos de entrada do histórico. Apenas data_hora_saida, cabecas_saida, peso_vivo_medio_saida_kg e desvio_tempo_ocupacao_percent podem ser atualizados.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_lote_pasto_historico_update ON public.lote_pasto_historico;
CREATE TRIGGER trg_proteger_lote_pasto_historico_update
  BEFORE UPDATE ON public.lote_pasto_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_lote_pasto_historico_update();

-- 7. Trigger de proteção: impedir DELETE em lote_modulo_historico
CREATE OR REPLACE FUNCTION public.proteger_lote_modulo_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Não é permitido excluir registros de lote_modulo_historico. Use correção auditada se necessário.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_lote_modulo_historico_delete ON public.lote_modulo_historico;
CREATE TRIGGER trg_proteger_lote_modulo_historico_delete
  BEFORE DELETE ON public.lote_modulo_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_lote_modulo_historico();

-- 8. Trigger de proteção: limitar UPDATE em lote_modulo_historico
CREATE OR REPLACE FUNCTION public.proteger_lote_modulo_historico_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (
    OLD.id IS DISTINCT FROM NEW.id OR
    OLD.lote_id IS DISTINCT FROM NEW.lote_id OR
    OLD.modulo_id IS DISTINCT FROM NEW.modulo_id OR
    OLD.data_hora_entrada IS DISTINCT FROM NEW.data_hora_entrada OR
    OLD.cabecas_entrada IS DISTINCT FROM NEW.cabecas_entrada OR
    OLD.peso_vivo_medio_entrada_kg IS DISTINCT FROM NEW.peso_vivo_medio_entrada_kg OR
    OLD.meta_intervalo_ocupacao_dias IS DISTINCT FROM NEW.meta_intervalo_ocupacao_dias OR
    OLD.created_at IS DISTINCT FROM NEW.created_at
  ) THEN
    RAISE EXCEPTION 'Não é permitido alterar campos de entrada do histórico de módulo. Apenas data_hora_saida, cabecas_saida, peso_vivo_medio_saida_kg e desvio_tempo_ocupacao_percent podem ser atualizados.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_lote_modulo_historico_update ON public.lote_modulo_historico;
CREATE TRIGGER trg_proteger_lote_modulo_historico_update
  BEFORE UPDATE ON public.lote_modulo_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_lote_modulo_historico_update();
;
