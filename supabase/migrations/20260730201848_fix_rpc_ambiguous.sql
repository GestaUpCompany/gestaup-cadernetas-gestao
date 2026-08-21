DROP FUNCTION IF EXISTS public.recalcular_metricas_suplementacao(uuid);

CREATE OR REPLACE FUNCTION public.recalcular_metricas_suplementacao(p_fazenda_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  registro_id uuid,
  lote_id uuid,
  formulacao text,
  data date,
  consumo_kg_mn numeric,
  consumo_kg_ms numeric,
  consumo_pct_pv numeric,
  custo_medio numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
             array_agg(r.data::date ORDER BY r.data),
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
$function$;;
