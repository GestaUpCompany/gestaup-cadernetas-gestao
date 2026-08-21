CREATE OR REPLACE FUNCTION public.recalcular_formulacao(p_formulacao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_formulacao RECORD;
  v_meta_pv numeric;
  v_peso_vivo numeric;
  v_e_premix boolean;
  v_consumo_ms_total numeric;
  v_teor_ms_dieta numeric;
  v_custo_total numeric;
  v_custo_ms_tonelada numeric;
  v_consumo_ms_kg_cab_dia numeric;
  v_consumo_mn_kg_cab_dia numeric;
  v_custo_dieta_reais_cab_dia numeric;
  v_total_bruta numeric;
  v_row RECORD;
  v_mn_bruta numeric;
  v_mn_percent numeric;
  v_consumo_ms numeric;
  v_consumo_mn numeric;
  v_custo_dieta numeric;
BEGIN
  SELECT consumo_ms_percent_pv, peso_vivo_medio, e_premix
  INTO v_formulacao
  FROM public.formulacoes
  WHERE id = p_formulacao_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_meta_pv := COALESCE(v_formulacao.consumo_ms_percent_pv, 0);
  v_peso_vivo := COALESCE(v_formulacao.peso_vivo_medio, 0);
  v_e_premix := COALESCE(v_formulacao.e_premix, false);
  v_consumo_ms_total := v_peso_vivo * (v_meta_pv / 100.0);

  -- Passada 1: calcular mn_bruta total
  v_total_bruta := 0;
  FOR v_row IN
    SELECT COALESCE(i.teor_ms, 0) AS teor_ms,
           COALESCE(i.preco_ton_mn, 0) AS preco_ton_mn,
           COALESCE(fi.formula_teor_ms, 0) AS formula_teor_ms
    FROM public.formulacao_insumos fi
    JOIN public.insumos i ON i.id = fi.insumo_id
    WHERE fi.formulacao_id = p_formulacao_id
  LOOP
    IF v_row.teor_ms > 0 THEN
      v_mn_bruta := v_row.formula_teor_ms / (v_row.teor_ms / 100.0);
    ELSE
      v_mn_bruta := 0;
    END IF;
    v_total_bruta := v_total_bruta + v_mn_bruta;
  END LOOP;

  -- Passada 2: calcular derivados acumulando totais
  v_teor_ms_dieta := 0;
  v_custo_total := 0;
  v_consumo_ms_kg_cab_dia := 0;
  v_consumo_mn_kg_cab_dia := 0;
  v_custo_dieta_reais_cab_dia := 0;

  FOR v_row IN
    SELECT COALESCE(i.teor_ms, 0) AS teor_ms,
           COALESCE(i.preco_ton_mn, 0) AS preco_ton_mn,
           COALESCE(fi.formula_teor_ms, 0) AS formula_teor_ms
    FROM public.formulacao_insumos fi
    JOIN public.insumos i ON i.id = fi.insumo_id
    WHERE fi.formulacao_id = p_formulacao_id
  LOOP
    IF v_row.teor_ms > 0 THEN
      v_mn_bruta := v_row.formula_teor_ms / (v_row.teor_ms / 100.0);
    ELSE
      v_mn_bruta := 0;
    END IF;

    IF v_total_bruta > 0 THEN
      v_mn_percent := (v_mn_bruta / v_total_bruta) * 100.0;
    ELSE
      v_mn_percent := 0;
    END IF;

    v_teor_ms_dieta := v_teor_ms_dieta + (v_mn_percent * v_row.teor_ms);
    v_custo_total := v_custo_total + (v_row.preco_ton_mn * v_mn_percent / 100.0);

    v_consumo_ms := v_consumo_ms_total * (v_row.formula_teor_ms / 100.0);
    IF v_row.teor_ms > 0 THEN
      v_consumo_mn := v_consumo_ms / (v_row.teor_ms / 100.0);
    ELSE
      v_consumo_mn := 0;
    END IF;
    v_custo_dieta := v_consumo_mn * (v_row.preco_ton_mn / 1000.0);

    v_consumo_ms_kg_cab_dia := v_consumo_ms_kg_cab_dia + v_consumo_ms;
    v_consumo_mn_kg_cab_dia := v_consumo_mn_kg_cab_dia + v_consumo_mn;
    v_custo_dieta_reais_cab_dia := v_custo_dieta_reais_cab_dia + v_custo_dieta;
  END LOOP;

  v_teor_ms_dieta := v_teor_ms_dieta / 100.0;

  IF v_teor_ms_dieta > 0 THEN
    v_custo_ms_tonelada := v_custo_total / (v_teor_ms_dieta / 100.0);
  ELSE
    v_custo_ms_tonelada := 0;
  END IF;

  UPDATE public.formulacoes
  SET
    teor_ms_dieta = ROUND(v_teor_ms_dieta, 2),
    custo_total = ROUND(v_custo_total, 2),
    custo_mn_tonelada = ROUND(v_custo_total, 2),
    custo_ms_tonelada = ROUND(v_custo_ms_tonelada, 2),
    consumo_ms_kg_cab_dia = CASE WHEN v_e_premix THEN 0 ELSE ROUND(v_consumo_ms_kg_cab_dia, 3) END,
    consumo_mn_kg_cab_dia = CASE WHEN v_e_premix THEN 0 ELSE ROUND(v_consumo_mn_kg_cab_dia, 3) END,
    custo_dieta_reais_cab_dia = CASE WHEN v_e_premix THEN 0 ELSE ROUND(v_custo_dieta_reais_cab_dia, 2) END
  WHERE id = p_formulacao_id;
END;
$function$;;
