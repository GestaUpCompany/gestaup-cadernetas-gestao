-- ============================================================
-- Migration: Corrigir timezone do banco para America/Cuiaba
--
-- Problema: o Supabase opera em UTC por default. Todas as fazendas
-- operam em Cuiabá (UTC-4, sem DST desde 2019). O PWA envia
-- timestamps com offset Cuiabá correto, o Supabase armazena como
-- UTC canônico, mas extrações SQL (data::date, CURRENT_DATE,
-- to_char) operam em UTC, produzindo datas 1 dia à frente para
-- registros feitos após as 20:00 Cuiabá (00:00-04:00 UTC).
--
-- Solução de 3 camadas:
-- 1. ALTER DATABASE SET timezone: faz data::date, CURRENT_DATE,
--    to_char operarem em Cuiabá para todas as novas sessões.
-- 2. SET timezone nas funções SECURITY DEFINER: imune a resets do
--    pooler (Supavisor transaction pooling).
-- 3. AT TIME ZONE 'America/Cuiaba' por expressão nas 5 funções
--    críticas que extraem data de timestamptz: redundância intencional
--    para integridade máxima.
--
-- Timestamps armazenados NÃO são modificados. O instante real
-- 2026-07-28T00:17:00+00 (20:17 Cuiabá) é correto. Após a mudança,
-- SELECT data exibe 2026-07-27 20:17:00-04.
-- ============================================================

-- ============================================================
-- CAMADA 1: ALTER DATABASE
-- ============================================================
ALTER DATABASE postgres SET timezone TO 'America/Cuiaba';

-- ============================================================
-- CAMADA 3: CREATE OR REPLACE das 5 funções críticas com
-- AT TIME ZONE 'America/Cuiaba' nas extrações de data de timestamptz
-- (inclui CAMADA 2: SET timezone na cláusula da função)
-- ============================================================

-- 3.1. calcular_consumo_registro_anterior()
-- Trigger AFTER INSERT em registros_suplementacao.
-- Usa NEW.data::date e v_prev.data::date para calcular intervalo.
CREATE OR REPLACE FUNCTION public.calcular_consumo_registro_anterior()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET timezone TO 'America/Cuiaba'
AS $function$
DECLARE
  v_prev RECORD;
  v_dias INTEGER;
  v_animais_elegiveis INTEGER;
  v_consumo_kg_mn NUMERIC;
  v_consumo_kg_ms NUMERIC;
  v_consumo_pct_pv NUMERIC;
  v_custo_medio NUMERIC;
  v_teor_ms NUMERIC;
  v_custo_mn_tonelada NUMERIC;
BEGIN
  -- So calcula se o novo registro tem lote_id e formulacao
  IF NEW.lote_id IS NULL OR NEW.formulacao IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar o registro anterior do mesmo lote+formulacao (data imediatamente antes de NEW)
  SELECT id, data, kg_cocho, n_cabecas, qtd_bezerros, peso_vivo_kg, formulacao
  INTO v_prev
  FROM registros_suplementacao
  WHERE lote_id = NEW.lote_id
    AND formulacao = NEW.formulacao
    AND deleted_at IS NULL
    AND id != NEW.id
    AND data <= NEW.data
  ORDER BY data DESC
  LIMIT 1;

  -- Se nao ha registro anterior, nada a calcular
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Se o registro anterior nao tem kg_cocho, pular
  IF v_prev.kg_cocho IS NULL OR v_prev.kg_cocho = 0 THEN
    RETURN NEW;
  END IF;

  -- Animais elegiveis = n_cabecas - bezerros (bezerros nao consomem suplemento)
  v_animais_elegiveis := COALESCE(v_prev.n_cabecas, 0) - COALESCE(v_prev.qtd_bezerros, 0);
  IF v_animais_elegiveis <= 0 THEN
    RETURN NEW;
  END IF;

  -- Intervalo em dias (minimo 1 para evitar divisao por zero)
  -- AT TIME ZONE 'America/Cuiaba' garante extracao da data em Cuiaba
  v_dias := GREATEST(
    ((NEW.data AT TIME ZONE 'America/Cuiaba')::date - (v_prev.data AT TIME ZONE 'America/Cuiaba')::date),
    1
  );

  -- Consumo em kg de materia natural por cabeca/dia
  v_consumo_kg_mn := v_prev.kg_cocho / v_dias / v_animais_elegiveis;

  -- Buscar teor de MS e custo da formulacao
  SELECT f.teor_ms_dieta, f.custo_mn_tonelada
  INTO v_teor_ms, v_custo_mn_tonelada
  FROM formulacoes f
  WHERE f.fazenda_id = NEW.fazenda_id
    AND f.nome = v_prev.formulacao
    AND f.ativo = true
  LIMIT 1;

  -- Consumo em kg de materia seca
  IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
    v_consumo_kg_ms := v_consumo_kg_mn * (v_teor_ms / 100);
  ELSE
    v_consumo_kg_ms := NULL;
  END IF;

  -- Consumo como percentual do peso vivo
  IF v_consumo_kg_ms IS NOT NULL AND v_prev.peso_vivo_kg IS NOT NULL AND v_prev.peso_vivo_kg > 0 THEN
    v_consumo_pct_pv := (v_consumo_kg_ms / v_prev.peso_vivo_kg) * 100;
  ELSE
    v_consumo_pct_pv := NULL;
  END IF;

  -- Custo medio em R$/cab/dia
  IF v_custo_mn_tonelada IS NOT NULL AND v_consumo_kg_mn IS NOT NULL THEN
    v_custo_medio := (v_custo_mn_tonelada * v_consumo_kg_mn) / 1000;
  ELSE
    v_custo_medio := NULL;
  END IF;

  -- Atualizar o registro anterior com as metricas calculadas
  UPDATE registros_suplementacao
  SET
    consumo_medio_geral_kg_mn = v_consumo_kg_mn,
    consumo_medio_30dias_kg_mn = v_consumo_kg_mn,
    consumo_medio_geral_kg_ms = v_consumo_kg_ms,
    consumo_medio_30dias_kg_ms = v_consumo_kg_ms,
    consumo_medio_geral_percent_pv = v_consumo_pct_pv,
    consumo_medio_30dias_percent_pv = v_consumo_pct_pv,
    custo_medio_reais_cab_dia = v_custo_medio,
    updated_at = NOW()
  WHERE id = v_prev.id;

  RETURN NEW;
END;
$function$;

-- 3.2. recalcular_peso_vivo_lote(uuid, boolean)
-- Recalcula peso_vivo_kg de registros do lote quando parâmetros do plano mudam.
-- Usa rs.data::date para projetar peso na data do registro.
CREATE OR REPLACE FUNCTION public.recalcular_peso_vivo_lote(p_lote_id uuid, p_ajuste_manual boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET timezone TO 'America/Cuiaba'
AS $function$
DECLARE
  v_peso_base numeric;
  v_data_inicio date;
  v_gmd numeric;
  v_data_ajuste date;
  v_peso_atual numeric;
BEGIN
  -- Buscar parâmetros do plano ativo do lote
  SELECT
    COALESCE(pn.peso_inicio_kg_cab, lc.peso_entrada_kg_cab),
    pn.data_inicio,
    COALESCE(pn.gmd_planejado, f.gmd),
    lc.data_ajuste_peso,
    lc.peso_vivo_atual_kg_cab
  INTO v_peso_base, v_data_inicio, v_gmd, v_data_ajuste, v_peso_atual
  FROM lote_categorias lc
  JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
  JOIN formulacoes f ON f.id = pn.formulacao_id
  WHERE lc.lote_id = p_lote_id
    AND lc.ativo = true
    AND lc.data_fim IS NULL
  LIMIT 1;

  -- Se não há plano ativo ou GMD, não há o que recalcular
  IF NOT FOUND OR v_gmd IS NULL THEN
    RETURN;
  END IF;

  -- Caso 1: data_ajuste_peso definida
  IF v_data_ajuste IS NOT NULL AND v_peso_atual IS NOT NULL THEN
    IF p_ajuste_manual THEN
      -- Ajuste manual: peso_vivo_atual_kg_cab é o peso na data_ajuste_peso.
      -- Projeção: peso_ajuste + gmd * (D - data_ajuste)
      UPDATE registros_suplementacao rs
      SET peso_vivo_kg = v_peso_atual + v_gmd * (((rs.data AT TIME ZONE 'America/Cuiaba')::date - v_data_ajuste)::integer),
          updated_at = NOW()
      WHERE rs.lote_id = p_lote_id
        AND rs.deleted_at IS NULL
        AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_atual + v_gmd * (((rs.data AT TIME ZONE 'America/Cuiaba')::date - v_data_ajuste)::integer));
    ELSE
      -- Cron ou outro trigger: peso_vivo_atual_kg_cab é o peso projetado para hoje.
      -- Projeção: peso_atual + gmd * (D - hoje)
      -- CURRENT_DATE já retorna data Cuiabá com SET timezone na função.
      UPDATE registros_suplementacao rs
      SET peso_vivo_kg = v_peso_atual + v_gmd * (((rs.data AT TIME ZONE 'America/Cuiaba')::date - CURRENT_DATE)::integer),
          updated_at = NOW()
      WHERE rs.lote_id = p_lote_id
        AND rs.deleted_at IS NULL
        AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_atual + v_gmd * (((rs.data AT TIME ZONE 'America/Cuiaba')::date - CURRENT_DATE)::integer));
    END IF;

  -- Caso 2: sem data_ajuste_peso, usar peso_inicio + gmd * dias desde data_inicio
  ELSE
    IF v_peso_base IS NULL OR v_data_inicio IS NULL THEN
      RETURN;
    END IF;

    UPDATE registros_suplementacao rs
    SET peso_vivo_kg = v_peso_base + v_gmd * GREATEST(((rs.data AT TIME ZONE 'America/Cuiaba')::date - v_data_inicio)::integer, 0),
        updated_at = NOW()
    WHERE rs.lote_id = p_lote_id
      AND rs.deleted_at IS NULL
      AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_base + v_gmd * GREATEST(((rs.data AT TIME ZONE 'America/Cuiaba')::date - v_data_inicio)::integer, 0));
  END IF;
END;
$function$;

-- 3.3. recalcular_peso_vivo_lote(uuid) — overload antigo sem p_ajuste_manual
-- Mantido para compatibilidade. Usa a fórmula do caso 1 (p_ajuste_manual=false).
CREATE OR REPLACE FUNCTION public.recalcular_peso_vivo_lote(p_lote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET timezone TO 'America/Cuiaba'
AS $function$
DECLARE
  v_peso_base numeric;
  v_data_inicio date;
  v_gmd numeric;
  v_data_ajuste date;
  v_peso_atual numeric;
BEGIN
  -- Buscar parâmetros do plano ativo do lote
  SELECT
    COALESCE(pn.peso_inicio_kg_cab, lc.peso_entrada_kg_cab),
    pn.data_inicio,
    COALESCE(pn.gmd_planejado, f.gmd),
    lc.data_ajuste_peso,
    lc.peso_vivo_atual_kg_cab
  INTO v_peso_base, v_data_inicio, v_gmd, v_data_ajuste, v_peso_atual
  FROM lote_categorias lc
  JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
  JOIN formulacoes f ON f.id = pn.formulacao_id
  WHERE lc.lote_id = p_lote_id
    AND lc.ativo = true
    AND lc.data_fim IS NULL
  LIMIT 1;

  -- Se não há plano ativo ou GMD, não há o que recalcular
  IF NOT FOUND OR v_gmd IS NULL THEN
    RETURN;
  END IF;

  -- Caso 1: data_ajuste_peso definida
  IF v_data_ajuste IS NOT NULL AND v_peso_atual IS NOT NULL THEN
    UPDATE registros_suplementacao rs
    SET peso_vivo_kg = v_peso_atual + v_gmd * (((rs.data AT TIME ZONE 'America/Cuiaba')::date - CURRENT_DATE)::integer),
        updated_at = NOW()
    WHERE rs.lote_id = p_lote_id
      AND rs.deleted_at IS NULL
      AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_atual + v_gmd * (((rs.data AT TIME ZONE 'America/Cuiaba')::date - CURRENT_DATE)::integer));

  -- Caso 2: sem data_ajuste_peso, usar peso_inicio + gmd * dias desde data_inicio
  ELSE
    IF v_peso_base IS NULL OR v_data_inicio IS NULL THEN
      RETURN;
    END IF;

    UPDATE registros_suplementacao rs
    SET peso_vivo_kg = v_peso_base + v_gmd * GREATEST(((rs.data AT TIME ZONE 'America/Cuiaba')::date - v_data_inicio)::integer, 0),
        updated_at = NOW()
    WHERE rs.lote_id = p_lote_id
      AND rs.deleted_at IS NULL
      AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_base + v_gmd * GREATEST(((rs.data AT TIME ZONE 'America/Cuiaba')::date - v_data_inicio)::integer, 0));
  END IF;
END;
$function$;

-- 3.4. get_dados_relatorio_consumo(uuid, date, date)
-- RPC para relatório público de consumo. Usa r.data::date para filtros,
-- to_char(r.data, ...) para labels, e now()::date para cálculo de dias.
CREATE OR REPLACE FUNCTION public.get_dados_relatorio_consumo(
  p_token uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET timezone TO 'America/Cuiaba'
AS $function$
DECLARE
  v_fazenda_id uuid;
  v_ativo boolean;
  v_expira timestamptz;
  v_fazenda_nome text;
  v_fazenda_logo_url text;
  v_lotes jsonb;
  v_lotes_disponiveis jsonb;
BEGIN
  -- Validar token
  SELECT fazenda_id, ativo, expira_em INTO v_fazenda_id, v_ativo, v_expira
  FROM relatorios_publicos
  WHERE id = p_token AND tipo = 'consumo';

  IF NOT FOUND OR v_ativo = false OR (v_expira IS NOT NULL AND v_expira < now()) THEN
    RAISE EXCEPTION 'Token invalido ou expirado';
  END IF;

  -- Buscar nome e logo da fazenda
  SELECT nome, logo_url INTO v_fazenda_nome, v_fazenda_logo_url
  FROM fazendas
  WHERE id = v_fazenda_id;

  -- Lotes disponíveis (todos com registros, sem filtro de data, para o slicer)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('lote_id', l.id, 'lote_nome', l.nome) ORDER BY l.nome), '[]'::jsonb)
  INTO v_lotes_disponiveis
  FROM (
    SELECT DISTINCT r.lote_id
    FROM registros_suplementacao r
    WHERE r.fazenda_id = v_fazenda_id
      AND r.deleted_at IS NULL
      AND r.lote_id IS NOT NULL
  ) regs
  JOIN lotes l ON l.id = regs.lote_id
  ORDER BY l.nome;

  -- Dados calculados por lote
  WITH registros_windowed AS (
    SELECT
      r.lote_id,
      r.data,
      to_char(r.data AT TIME ZONE 'America/Cuiaba', 'DD/MM') AS data_label,
      LAG(r.kg_cocho) OVER w AS lag_kg_cocho,
      LAG(r.n_cabecas) OVER w AS lag_n_cabecas,
      LAG(r.qtd_bezerros) OVER w AS lag_qtd_bezerros,
      LAG(r.consumo_medio_geral_percent_pv) OVER w AS lag_consumo_percent_pv,
      LAG(r.leitura) OVER w AS lag_leitura,
      LAG(r.custo_medio_reais_cab_dia) OVER w AS lag_custo,
      LAG(r.data) OVER w AS lag_data
    FROM registros_suplementacao r
    WHERE r.fazenda_id = v_fazenda_id
      AND r.deleted_at IS NULL
      AND r.lote_id IS NOT NULL
      AND (p_data_inicio IS NULL OR (r.data AT TIME ZONE 'America/Cuiaba')::date >= p_data_inicio)
      AND (p_data_fim IS NULL OR (r.data AT TIME ZONE 'America/Cuiaba')::date <= p_data_fim)
    WINDOW w AS (PARTITION BY r.lote_id ORDER BY r.data, r.created_at)
  ),
  dados_por_lote AS (
    SELECT
      lote_id,
      jsonb_agg(jsonb_build_object(
        'data', to_char(data AT TIME ZONE 'America/Cuiaba', 'YYYY-MM-DD'),
        'data_label', data_label,
        'trato_kg_cab_dia',
          CASE WHEN lag_kg_cocho IS NOT NULL AND lag_data IS NOT NULL THEN
            lag_kg_cocho / GREATEST(1, ((data AT TIME ZONE 'America/Cuiaba')::date - (lag_data AT TIME ZONE 'America/Cuiaba')::date)) / GREATEST(1, COALESCE(lag_n_cabecas, 0) - COALESCE(lag_qtd_bezerros, 0))
          ELSE NULL END,
        'consumo_percent_pv', COALESCE(lag_consumo_percent_pv, 0),
        'leitura_cocho', CASE WHEN lag_leitura IS NOT NULL AND lag_leitura ~ '^[0-9]+\.?[0-9]*$' THEN lag_leitura::numeric ELSE NULL END,
        'custo_reais_cab_dia', lag_custo
      ) ORDER BY data) AS dados
    FROM registros_windowed
    WHERE lag_data IS NOT NULL
    GROUP BY lote_id
  ),
  lotes_com_registros AS (
    SELECT DISTINCT lote_id
    FROM registros_suplementacao
    WHERE fazenda_id = v_fazenda_id
      AND deleted_at IS NULL
      AND lote_id IS NOT NULL
      AND (p_data_inicio IS NULL OR (data AT TIME ZONE 'America/Cuiaba')::date >= p_data_inicio)
      AND (p_data_fim IS NULL OR (data AT TIME ZONE 'America/Cuiaba')::date <= p_data_fim)
  ),
  info_lotes AS (
    SELECT
      lcr.lote_id,
      l.nome AS lote_nome,
      lc.peso_entrada_kg_cab,
      lc.peso_vivo_atual_kg_cab,
      to_char(lc.data_meta_projetada, 'YYYY-MM-DD') AS data_prevista_final,
      lc.quant_atual AS n_cabecas_atual,
      lc.raca,
      lc.categoria,
      f.nome AS dieta,
      to_char(pn.data_inicio, 'YYYY-MM-DD') AS data_inicio_plano,
      CASE WHEN pn.data_inicio IS NOT NULL THEN GREATEST(0, ((now() AT TIME ZONE 'America/Cuiaba')::date - pn.data_inicio::date)) ELSE NULL END AS dias
    FROM lotes_com_registros lcr
    JOIN lotes l ON l.id = lcr.lote_id
    LEFT JOIN LATERAL (
      SELECT lc.* FROM lote_categorias lc
      WHERE lc.lote_id = lcr.lote_id AND lc.ativo = true
      ORDER BY lc.created_at DESC
      LIMIT 1
    ) lc ON true
    LEFT JOIN formulacoes f ON f.id = COALESCE(lc.formulacao_id, (
      SELECT pn2.formulacao_id FROM planos_nutricionais pn2
      WHERE pn2.lote_categoria_id = lc.id AND pn2.ativo = true AND pn2.fazenda_id = v_fazenda_id
      LIMIT 1
    ))
    LEFT JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true AND pn.fazenda_id = v_fazenda_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'lote_id', il.lote_id,
    'lote_nome', il.lote_nome,
    'info', jsonb_build_object(
      'lote_id', il.lote_id,
      'lote_nome', il.lote_nome,
      'peso_entrada_kg', il.peso_entrada_kg_cab,
      'peso_atual_kg', il.peso_vivo_atual_kg_cab,
      'data_prevista_final', il.data_prevista_final,
      'n_cabecas_atual', il.n_cabecas_atual,
      'raca', il.raca,
      'categoria', il.categoria,
      'dieta', il.dieta,
      'data_inicio_plano', il.data_inicio_plano,
      'dias', il.dias
    ),
    'dados', COALESCE(dp.dados, '[]'::jsonb)
  ) ORDER BY il.lote_nome), '[]'::jsonb)
  INTO v_lotes
  FROM info_lotes il
  LEFT JOIN dados_por_lote dp ON dp.lote_id = il.lote_id;

  RETURN jsonb_build_object(
    'fazenda_id', v_fazenda_id,
    'dados', jsonb_build_object(
      'fazenda_nome', v_fazenda_nome,
      'fazenda_logo_url', v_fazenda_logo_url,
      'lotes', v_lotes,
      'lotes_disponiveis', v_lotes_disponiveis
    )
  );
END;
$function$;

-- 3.5. recalcular_metricas_suplementacao(uuid)
-- Recalcula consumo de todos os registros de uma fazenda.
-- Usa r.data::date no array_agg para calcular intervalos.
CREATE OR REPLACE FUNCTION public.recalcular_metricas_suplementacao(p_fazenda_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(registro_id uuid, lote_id uuid, formulacao text, data date, consumo_kg_mn numeric, consumo_kg_ms numeric, consumo_pct_pv numeric, custo_medio numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET timezone TO 'America/Cuiaba'
AS $function$
DECLARE
  v_fazenda UUID;
  v_fazendas UUID[];
  v_lote_id UUID;
  v_formulacao TEXT;
  v_registros UUID[];
  v_datas DATE[];
  v_kgs NUMERIC[];
  v_cabecas INTEGER[];
  v_bezerros INTEGER[];
  v_pesos NUMERIC[];
  v_teor_ms NUMERIC;
  v_custo_mn_tonelada NUMERIC;
  v_i INTEGER;
  v_dias INTEGER;
  v_animais INTEGER;
  v_consumo_mn NUMERIC;
  v_consumo_ms NUMERIC;
  v_consumo_pct NUMERIC;
  v_custo NUMERIC;
  v_fazenda_idx INTEGER;
BEGIN
  IF p_fazenda_id IS NULL THEN
    SELECT array_agg(DISTINCT fazenda_id)
    INTO v_fazendas
    FROM registros_suplementacao
    WHERE deleted_at IS NULL AND fazenda_id IS NOT NULL;
  ELSE
    v_fazendas := ARRAY[p_fazenda_id];
  END IF;

  IF v_fazendas IS NULL OR array_length(v_fazendas, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR v_fazenda_idx IN 1 .. array_length(v_fazendas, 1) LOOP
    v_fazenda := v_fazendas[v_fazenda_idx];

    FOR v_lote_id, v_formulacao IN
      SELECT DISTINCT r.lote_id, r.formulacao
      FROM registros_suplementacao r
      WHERE r.fazenda_id = v_fazenda
        AND r.deleted_at IS NULL
        AND r.lote_id IS NOT NULL
        AND r.formulacao IS NOT NULL
    LOOP
      SELECT f.teor_ms_dieta, f.custo_mn_tonelada
      INTO v_teor_ms, v_custo_mn_tonelada
      FROM formulacoes f
      WHERE f.fazenda_id = v_fazenda
        AND f.nome = v_formulacao
        AND f.ativo = true
      LIMIT 1;

      SELECT array_agg(r.id ORDER BY r.data),
             array_agg((r.data AT TIME ZONE 'America/Cuiaba')::date ORDER BY r.data),
             array_agg(r.kg_cocho ORDER BY r.data),
             array_agg(r.n_cabecas ORDER BY r.data),
             array_agg(r.qtd_bezerros ORDER BY r.data),
             array_agg(r.peso_vivo_kg ORDER BY r.data)
      INTO v_registros, v_datas, v_kgs, v_cabecas, v_bezerros, v_pesos
      FROM registros_suplementacao r
      WHERE r.fazenda_id = v_fazenda
        AND r.lote_id = v_lote_id
        AND r.formulacao = v_formulacao
        AND r.deleted_at IS NULL;

      IF v_registros IS NULL OR array_length(v_registros, 1) IS NULL OR array_length(v_registros, 1) < 2 THEN
        CONTINUE;
      END IF;

      FOR v_i IN 1 .. array_length(v_registros, 1) - 1 LOOP
        IF v_kgs[v_i] IS NULL OR v_kgs[v_i] = 0 THEN
          CONTINUE;
        END IF;

        IF v_cabecas[v_i] IS NULL THEN
          CONTINUE;
        END IF;

        v_animais := COALESCE(v_cabecas[v_i], 0) - COALESCE(v_bezerros[v_i], 0);
        IF v_animais <= 0 THEN
          CONTINUE;
        END IF;

        v_dias := GREATEST((v_datas[v_i + 1] - v_datas[v_i]), 1);

        v_consumo_mn := v_kgs[v_i] / v_dias / v_animais;

        IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
          v_consumo_ms := v_consumo_mn * (v_teor_ms / 100);
        ELSE
          v_consumo_ms := NULL;
        END IF;

        IF v_consumo_ms IS NOT NULL AND v_pesos[v_i] IS NOT NULL AND v_pesos[v_i] > 0 THEN
          v_consumo_pct := (v_consumo_ms / v_pesos[v_i]) * 100;
        ELSE
          v_consumo_pct := NULL;
        END IF;

        IF v_custo_mn_tonelada IS NOT NULL AND v_consumo_mn IS NOT NULL THEN
          v_custo := (v_custo_mn_tonelada * v_consumo_mn) / 1000;
        ELSE
          v_custo := NULL;
        END IF;

        UPDATE registros_suplementacao
        SET
          consumo_medio_geral_kg_mn = v_consumo_mn,
          consumo_medio_30dias_kg_mn = v_consumo_mn,
          consumo_medio_geral_kg_ms = v_consumo_ms,
          consumo_medio_30dias_kg_ms = v_consumo_ms,
          consumo_medio_geral_percent_pv = v_consumo_pct,
          consumo_medio_30dias_percent_pv = v_consumo_pct,
          custo_medio_reais_cab_dia = v_custo,
          updated_at = NOW()
        WHERE id = v_registros[v_i];

        RETURN QUERY SELECT
          v_registros[v_i],
          v_lote_id,
          v_formulacao,
          v_datas[v_i],
          v_consumo_mn,
          v_consumo_ms,
          v_consumo_pct,
          v_custo;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$function$;

-- ============================================================
-- CAMADA 2: SET timezone em todas as funções SECURITY DEFINER
-- que não foram recriadas acima. Para funções sem search_path,
-- adiciona também SET search_path TO 'public'.
-- ============================================================
DO $$
DECLARE
  r RECORD;
  has_search_path boolean;
  has_timezone boolean;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = true
    -- Skip the 5 functions already recreated above
    AND NOT (
      (p.proname = 'calcular_consumo_registro_anterior' AND pg_get_function_identity_arguments(p.oid) = '')
      OR (p.proname = 'recalcular_peso_vivo_lote' AND pg_get_function_identity_arguments(p.oid) = 'p_lote_id uuid, p_ajuste_manual boolean')
      OR (p.proname = 'recalcular_peso_vivo_lote' AND pg_get_function_identity_arguments(p.oid) = 'p_lote_id uuid')
      OR (p.proname = 'get_dados_relatorio_consumo' AND pg_get_function_identity_arguments(p.oid) = 'p_token uuid, p_data_inicio date, p_data_fim date')
      OR (p.proname = 'recalcular_metricas_suplementacao' AND pg_get_function_identity_arguments(p.oid) = 'p_fazenda_id uuid')
    )
  LOOP
    has_search_path := false;
    has_timezone := false;

    IF r.proconfig IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM unnest(r.proconfig) WHERE c LIKE 'search_path=%') INTO has_search_path;
      SELECT EXISTS(SELECT 1 FROM unnest(r.proconfig) WHERE c ILIKE 'TimeZone=%') INTO has_timezone;
    END IF;

    -- Add search_path if missing
    IF NOT has_search_path THEN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path TO ''public''', r.proname, r.args);
    END IF;

    -- Add timezone if missing
    IF NOT has_timezone THEN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET timezone TO ''America/Cuiaba''', r.proname, r.args);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- Verificação: confirmar que todas as funções SECURITY DEFINER
-- têm timezone configurado
-- ============================================================
-- Deve retornar 0 funções sem timezone:
-- SELECT count(*) FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' AND p.prosecdef = true
--   AND (p.proconfig IS NULL OR NOT EXISTS (
--     SELECT 1 FROM unnest(p.proconfig) WHERE c ILIKE 'TimeZone=%'
--   ));
