CREATE OR REPLACE FUNCTION recalcular_metricas_suplementacao(p_fazenda_id UUID DEFAULT NULL)
RETURNS TABLE(
  registro_id UUID,
  peso_vivo_medio NUMERIC,
  animais_elegiveis INTEGER,
  consumo_geral_pct_pv NUMERIC,
  consumo_30dias_pct_pv NUMERIC,
  consumo_geral_kg_mn NUMERIC,
  consumo_30dias_kg_mn NUMERIC,
  consumo_geral_kg_ms NUMERIC,
  consumo_30dias_kg_ms NUMERIC,
  custo_medio_reais_cab_dia NUMERIC
) AS $$
DECLARE
  v_fazenda UUID;
  v_fazendas UUID[];
  v_registro RECORD;
  v_lote_id UUID;
  v_formulacao_nome TEXT;
  v_teor_ms NUMERIC;
  v_custo_mn_tonelada NUMERIC;
  v_peso_vivo_medio NUMERIC;
  v_animais_elegiveis INTEGER;
  v_registros_lote UUID[];
  v_datas_lote DATE[];
  v_kgs_lote NUMERIC[];
  v_total_dias INTEGER;
  v_total_mn NUMERIC;
  v_data_atual DATE;
  v_data_inicio DATE;
  v_data_fim DATE;
  v_i INTEGER;
  v_j INTEGER;
  v_intervalo_dias INTEGER;
  v_consumo_geral_kg_mn NUMERIC;
  v_consumo_30dias_kg_mn NUMERIC;
  v_consumo_geral_kg_ms NUMERIC;
  v_consumo_30dias_kg_ms NUMERIC;
  v_consumo_geral_pct_pv NUMERIC;
  v_consumo_30dias_pct_pv NUMERIC;
  v_custo_medio NUMERIC;
  v_fazenda_idx INTEGER;
BEGIN
  -- Se não passou fazenda, pega todas as fazendas que têm registros de suplementação
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

    FOR v_registro IN
      SELECT r.id, r.lote_id, r.formulacao, r.data::date as data_reg, r.kg_cocho
      FROM registros_suplementacao r
      WHERE r.fazenda_id = v_fazenda
        AND r.deleted_at IS NULL
        AND r.lote_id IS NOT NULL
      ORDER BY r.lote_id, r.data
    LOOP
      v_lote_id := v_registro.lote_id;
      v_formulacao_nome := v_registro.formulacao;

      -- Categorias do lote (excluir bezerros/bezerras)
      SELECT
        COALESCE(SUM(CASE WHEN LOWER(c.categoria) NOT LIKE '%bezerro%' AND LOWER(c.categoria) NOT LIKE '%bezerra%' THEN c.quant_atual ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(c.categoria) NOT LIKE '%bezerro%' AND LOWER(c.categoria) NOT LIKE '%bezerra%' THEN c.peso_vivo_atual_kg_cab * c.quant_atual ELSE 0 END), 0) /
        NULLIF(SUM(CASE WHEN LOWER(c.categoria) NOT LIKE '%bezerro%' AND LOWER(c.categoria) NOT LIKE '%bezerra%' THEN c.quant_atual ELSE 0 END), 0)
      INTO v_animais_elegiveis, v_peso_vivo_medio
      FROM lote_categorias c
      WHERE c.lote_id = v_lote_id;

      -- Se não houver peso vivo médio, pula
      IF v_peso_vivo_medio IS NULL OR v_animais_elegiveis = 0 THEN
        CONTINUE;
      END IF;

      -- Buscar formulação
      SELECT f.teor_ms_dieta, f.custo_mn_tonelada
      INTO v_teor_ms, v_custo_mn_tonelada
      FROM formulacoes f
      WHERE f.fazenda_id = v_fazenda
        AND f.nome = v_formulacao_nome
      LIMIT 1;

      -- Buscar todos os registros do lote com a mesma formulação
      SELECT array_agg(r.id ORDER BY r.data::date),
             array_agg(r.data::date ORDER BY r.data::date),
             array_agg(r.kg_cocho ORDER BY r.data::date)
      INTO v_registros_lote, v_datas_lote, v_kgs_lote
      FROM registros_suplementacao r
      WHERE r.fazenda_id = v_fazenda
        AND r.lote_id = v_lote_id
        AND r.formulacao = v_formulacao_nome
        AND r.deleted_at IS NULL;

      -- Precisamos de pelo menos 2 registros
      IF array_length(v_registros_lote, 1) IS NULL OR array_length(v_registros_lote, 1) < 2 THEN
        CONTINUE;
      END IF;

      -- Calcular consumo médio geral (kg MN/cab/dia)
      v_total_mn := 0;
      v_total_dias := 0;
      FOR v_i IN 1 .. array_length(v_registros_lote, 1) - 1 LOOP
        v_intervalo_dias := GREATEST((v_datas_lote[v_i + 1] - v_datas_lote[v_i])::integer, 1);
        v_total_mn := v_total_mn + (v_kgs_lote[v_i] / v_intervalo_dias);
        v_total_dias := v_total_dias + 1;
      END LOOP;

      v_consumo_geral_kg_mn := v_total_mn / v_animais_elegiveis;

      -- Calcular consumo médio 30 dias (kg MN/cab/dia)
      v_data_atual := CURRENT_DATE;
      v_data_inicio := v_data_atual - 30;
      v_total_mn := 0;
      v_total_dias := 0;
      FOR v_i IN 1 .. array_length(v_registros_lote, 1) - 1 LOOP
        v_intervalo_dias := GREATEST((v_datas_lote[v_i + 1] - v_datas_lote[v_i])::integer, 1);
        v_data_atual := v_datas_lote[v_i];
        FOR v_j IN 0 .. v_intervalo_dias - 1 LOOP
          IF v_data_atual >= v_data_inicio AND v_data_atual <= CURRENT_DATE THEN
            v_total_mn := v_total_mn + (v_kgs_lote[v_i] / v_intervalo_dias);
            v_total_dias := v_total_dias + 1;
          END IF;
          v_data_atual := v_data_atual + 1;
        END LOOP;
      END LOOP;

      IF v_total_dias > 0 THEN
        v_consumo_30dias_kg_mn := (v_total_mn / v_total_dias) / v_animais_elegiveis;
      ELSE
        v_consumo_30dias_kg_mn := NULL;
      END IF;

      -- Calcular MS e %PV
      IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
        v_consumo_geral_kg_ms := v_consumo_geral_kg_mn * (v_teor_ms / 100);
        v_consumo_30dias_kg_ms := v_consumo_30dias_kg_mn * (v_teor_ms / 100);
      ELSE
        v_consumo_geral_kg_ms := NULL;
        v_consumo_30dias_kg_ms := NULL;
      END IF;

      IF v_consumo_geral_kg_ms IS NOT NULL THEN
        v_consumo_geral_pct_pv := (v_consumo_geral_kg_ms / v_peso_vivo_medio) * 100;
      ELSE
        v_consumo_geral_pct_pv := NULL;
      END IF;

      IF v_consumo_30dias_kg_ms IS NOT NULL THEN
        v_consumo_30dias_pct_pv := (v_consumo_30dias_kg_ms / v_peso_vivo_medio) * 100;
      ELSE
        v_consumo_30dias_pct_pv := NULL;
      END IF;

      -- Custo médio
      IF v_custo_mn_tonelada IS NOT NULL AND v_consumo_geral_kg_mn IS NOT NULL THEN
        v_custo_medio := (v_custo_mn_tonelada * v_consumo_geral_kg_mn) / 1000;
      ELSE
        v_custo_medio := NULL;
      END IF;

      -- Atualizar registro
      UPDATE registros_suplementacao
      SET
        consumo_medio_geral_percent_pv = v_consumo_geral_pct_pv,
        consumo_medio_30dias_percent_pv = v_consumo_30dias_pct_pv,
        consumo_medio_geral_kg_mn = v_consumo_geral_kg_mn,
        consumo_medio_30dias_kg_mn = v_consumo_30dias_kg_mn,
        consumo_medio_geral_kg_ms = v_consumo_geral_kg_ms,
        consumo_medio_30dias_kg_ms = v_consumo_30dias_kg_ms,
        custo_medio_reais_cab_dia = v_custo_medio,
        updated_at = NOW()
      WHERE id = v_registro.id;

      RETURN QUERY SELECT
        v_registro.id,
        v_peso_vivo_medio,
        v_animais_elegiveis,
        v_consumo_geral_pct_pv,
        v_consumo_30dias_pct_pv,
        v_consumo_geral_kg_mn,
        v_consumo_30dias_kg_mn,
        v_consumo_geral_kg_ms,
        v_consumo_30dias_kg_ms,
        v_custo_medio;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;;
