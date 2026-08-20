CREATE OR REPLACE FUNCTION public.calcular_consumo_registro_anterior()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  IF NEW.lote_id IS NULL OR NEW.formulacao IS NULL THEN
    RETURN NEW;
  END IF;

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

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_prev.kg_cocho IS NULL OR v_prev.kg_cocho = 0 THEN
    RETURN NEW;
  END IF;

  v_animais_elegiveis := COALESCE(v_prev.n_cabecas, 0) - COALESCE(v_prev.qtd_bezerros, 0);
  IF v_animais_elegiveis <= 0 THEN
    RETURN NEW;
  END IF;

  v_dias := GREATEST((NEW.data::date - v_prev.data::date), 1);

  v_consumo_kg_mn := v_prev.kg_cocho / v_dias / v_animais_elegiveis;

  SELECT f.teor_ms_dieta, f.custo_mn_tonelada
  INTO v_teor_ms, v_custo_mn_tonelada
  FROM formulacoes f
  WHERE f.fazenda_id = NEW.fazenda_id
    AND f.nome = v_prev.formulacao
    AND f.ativo = true
  LIMIT 1;

  IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
    v_consumo_kg_ms := v_consumo_kg_mn * (v_teor_ms / 100);
  ELSE
    v_consumo_kg_ms := NULL;
  END IF;

  IF v_consumo_kg_ms IS NOT NULL AND v_prev.peso_vivo_kg IS NOT NULL AND v_prev.peso_vivo_kg > 0 THEN
    v_consumo_pct_pv := (v_consumo_kg_ms / v_prev.peso_vivo_kg) * 100;
  ELSE
    v_consumo_pct_pv := NULL;
  END IF;

  IF v_custo_mn_tonelada IS NOT NULL AND v_consumo_kg_mn IS NOT NULL THEN
    v_custo_medio := (v_custo_mn_tonelada * v_consumo_kg_mn) / 1000;
  ELSE
    v_custo_medio := NULL;
  END IF;

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

DROP TRIGGER IF EXISTS trigger_consumo_registro_anterior ON public.registros_suplementacao;
CREATE TRIGGER trigger_consumo_registro_anterior
  AFTER INSERT ON public.registros_suplementacao
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_consumo_registro_anterior();;
