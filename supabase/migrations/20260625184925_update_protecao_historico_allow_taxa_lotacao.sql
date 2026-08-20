
-- ============================================================
-- 1. Atualizar trigger de proteção do lote_pasto_historico
--    para permitir também taxa_lotacao_ua_ha na saída
-- ============================================================
CREATE OR REPLACE FUNCTION public.proteger_lote_pasto_historico_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    RAISE EXCEPTION 'Não é permitido alterar campos de entrada do histórico. Apenas data_final, data_hora_saida, cabecas_saida, peso_vivo_medio_saida_kg, desvio_tempo_ocupacao_percent e taxa_lotacao_ua_ha podem ser atualizados.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 2. Atualizar trigger de proteção do lote_modulo_historico
--    para permitir também taxa_lotacao_ua_ha na saída
-- ============================================================
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
    RAISE EXCEPTION 'Não é permitido alterar campos de entrada do histórico de módulo. Apenas data_hora_saida, cabecas_saida, peso_vivo_medio_saida_kg, desvio_tempo_ocupacao_percent e taxa_lotacao_ua_ha podem ser atualizados.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 3. Função auxiliar: calcular taxa de lotação de um lote num pasto
-- ============================================================
CREATE OR REPLACE FUNCTION public.calcular_taxa_lotacao_pasto(
  p_lote_id uuid,
  p_pasto_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_area numeric;
  v_ua   numeric;
BEGIN
  SELECT area_util_ha INTO v_area FROM public.pastos WHERE id = p_pasto_id;

  IF v_area IS NULL OR v_area = 0 THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    SUM(lc.quant_atual * lc.peso_vivo_atual_kg_cab),
    (SELECT cabecas_entrada * peso_vivo_medio_entrada_kg
     FROM public.lote_pasto_historico
     WHERE lote_id = p_lote_id AND pasto_id = p_pasto_id AND data_hora_saida IS NULL
     LIMIT 1)
  ) / 450.0
  INTO v_ua
  FROM public.lote_categorias lc
  WHERE lc.lote_id = p_lote_id
    AND lc.quant_atual > 0
    AND lc.peso_vivo_atual_kg_cab IS NOT NULL;

  RETURN round(COALESCE(v_ua, 0) / v_area, 2);
END;
$$;


-- ============================================================
-- 4. Função auxiliar: calcular taxa de lotação total de um módulo
-- ============================================================
CREATE OR REPLACE FUNCTION public.calcular_taxa_lotacao_modulo(
  p_modulo_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_area    numeric;
  v_ua_total numeric := 0;
  v_rec     record;
  v_ua_lote numeric;
BEGIN
  SELECT area_util_total_ha INTO v_area FROM public.modulos_pastos WHERE id = p_modulo_id;

  IF v_area IS NULL OR v_area = 0 THEN
    RETURN NULL;
  END IF;

  -- Somar UA de todos os lotes ativos no módulo no momento do fechamento
  FOR v_rec IN
    SELECT h.lote_id, h.cabecas_entrada, h.peso_vivo_medio_entrada_kg
    FROM public.lote_modulo_historico h
    WHERE h.modulo_id = p_modulo_id AND h.data_hora_saida IS NULL
  LOOP
    SELECT COALESCE(
      SUM(lc.quant_atual * lc.peso_vivo_atual_kg_cab),
      v_rec.cabecas_entrada * v_rec.peso_vivo_medio_entrada_kg
    ) / 450.0
    INTO v_ua_lote
    FROM public.lote_categorias lc
    WHERE lc.lote_id = v_rec.lote_id
      AND lc.quant_atual > 0
      AND lc.peso_vivo_atual_kg_cab IS NOT NULL;

    v_ua_total := v_ua_total + COALESCE(v_ua_lote, 0);
  END LOOP;

  RETURN round(v_ua_total / v_area, 2);
END;
$$;


-- ============================================================
-- 5. Atualizar trg_registros_pastagens_mover_lote para persistir
--    taxa_lotacao_ua_ha e data_hora_saida ao fechar o histórico
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_registros_pastagens_mover_lote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pasto_entrada_id UUID;
  v_lote_id        UUID;
  v_pasto_saida_id UUID;
  v_taxa_lotacao   numeric;
  v_cabecas_saida  integer;
  v_peso_saida     numeric;
BEGIN
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

  IF NEW.pasto_entrada_id IS NOT NULL THEN
    pasto_entrada_id := NEW.pasto_entrada_id;
  ELSE
    SELECT id INTO pasto_entrada_id
    FROM public.pastos
    WHERE fazenda_id = NEW.fazenda_id AND nome = NEW.pasto_entrada
    LIMIT 1;
  END IF;

  IF v_lote_id IS NOT NULL AND pasto_entrada_id IS NOT NULL THEN
    -- Descobrir o pasto de saída atual do lote
    SELECT pasto_id INTO v_pasto_saida_id
    FROM public.lotes WHERE id = v_lote_id;

    -- Calcular taxa de lotação atual antes de mover
    v_taxa_lotacao := public.calcular_taxa_lotacao_pasto(v_lote_id, v_pasto_saida_id);

    -- Cabeças e peso atuais para registro de saída
    SELECT
      COALESCE(SUM(lc.quant_atual), NULL),
      public.calcular_peso_medio_lote(v_lote_id)
    INTO v_cabecas_saida, v_peso_saida
    FROM public.lote_categorias lc
    WHERE lc.lote_id = v_lote_id AND lc.quant_atual > 0;

    -- Atualizar lote
    UPDATE public.lotes SET pasto_id = pasto_entrada_id WHERE id = v_lote_id;

    -- Atualizar indivíduos
    UPDATE public.individuos
    SET pasto_atual = pasto_entrada_id, updated_at = now()
    WHERE fazenda_id = NEW.fazenda_id AND lote_atual = v_lote_id;

    -- Fechar entrada anterior: preencher saída + taxa
    UPDATE public.lote_pasto_historico
    SET
      data_final                 = NEW.data::date,
      data_hora_saida            = now(),
      cabecas_saida              = v_cabecas_saida,
      peso_vivo_medio_saida_kg   = v_peso_saida,
      taxa_lotacao_ua_ha         = v_taxa_lotacao,
      desvio_tempo_ocupacao_percent = CASE
        WHEN meta_intervalo_ocupacao_dias IS NOT NULL AND meta_intervalo_ocupacao_dias > 0
        THEN round(
          (EXTRACT(epoch FROM now() - data_hora_entrada) / 86400.0 - meta_intervalo_ocupacao_dias::numeric)
          / meta_intervalo_ocupacao_dias::numeric * 100.0
        , 2)
        ELSE NULL
      END
    WHERE lote_id = v_lote_id AND data_hora_saida IS NULL;

    -- Inserir novo registro de entrada
    INSERT INTO public.lote_pasto_historico (lote_id, pasto_id, data_inicial, data_hora_entrada)
    VALUES (v_lote_id, pasto_entrada_id, NEW.data::date, now());
  END IF;

  RETURN NEW;
END;
$$;
;
