CREATE OR REPLACE FUNCTION public.recalc_consumo_on_cabecas_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_prox RECORD;
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
  IF NEW.n_cabecas IS NOT DISTINCT FROM OLD.n_cabecas
     AND NEW.qtd_bezerros IS NOT DISTINCT FROM OLD.qtd_bezerros
     AND NEW.peso_vivo_kg IS NOT DISTINCT FROM OLD.peso_vivo_kg THEN
    RETURN NEW;
  END IF;

  IF NEW.lote_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Recalcular consumo do próprio registro (NEW)
  --    Série por lote_id apenas, independente da formulação.
  SELECT id, data INTO v_prox
  FROM registros_suplementacao
  WHERE lote_id = NEW.lote_id
    AND deleted_at IS NULL
    AND id != NEW.id
    AND data > NEW.data
  ORDER BY data ASC, created_at ASC
  LIMIT 1;

  IF FOUND AND NEW.kg_cocho IS NOT NULL AND NEW.kg_cocho > 0 THEN
    v_animais_elegiveis := COALESCE(NEW.n_cabecas, 0) - COALESCE(NEW.qtd_bezerros, 0);

    IF v_animais_elegiveis > 0 THEN
      v_dias := GREATEST(
        ((v_prox.data AT TIME ZONE 'America/Cuiaba')::date - (NEW.data AT TIME ZONE 'America/Cuiaba')::date),
        1
      );

      v_consumo_kg_mn := NEW.kg_cocho / v_dias / v_animais_elegiveis;

      SELECT f.teor_ms_dieta, f.custo_mn_tonelada
      INTO v_teor_ms, v_custo_mn_tonelada
      FROM formulacoes f
      WHERE f.fazenda_id = NEW.fazenda_id
        AND f.nome = NEW.formulacao
        AND f.ativo = true
      LIMIT 1;

      IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
        v_consumo_kg_ms := v_consumo_kg_mn * (v_teor_ms / 100);
      ELSE
        v_consumo_kg_ms := NULL;
      END IF;

      IF v_consumo_kg_ms IS NOT NULL AND NEW.peso_vivo_kg IS NOT NULL AND NEW.peso_vivo_kg > 0 THEN
        v_consumo_pct_pv := (v_consumo_kg_ms / NEW.peso_vivo_kg) * 100;
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
      WHERE id = NEW.id;
    END IF;
  END IF;

  -- 2. Recalcular consumo do registro anterior
  --    Série por lote_id apenas, independente da formulação.
  SELECT id, data, kg_cocho, n_cabecas, qtd_bezerros, peso_vivo_kg, formulacao
  INTO v_prev
  FROM registros_suplementacao
  WHERE lote_id = NEW.lote_id
    AND deleted_at IS NULL
    AND id != NEW.id
    AND data <= NEW.data
  ORDER BY data DESC, created_at DESC
  LIMIT 1;

  IF FOUND AND v_prev.kg_cocho IS NOT NULL AND v_prev.kg_cocho > 0 THEN
    v_animais_elegiveis := COALESCE(v_prev.n_cabecas, 0) - COALESCE(v_prev.qtd_bezerros, 0);

    IF v_animais_elegiveis > 0 THEN
      v_dias := GREATEST(
        ((NEW.data AT TIME ZONE 'America/Cuiaba')::date - (v_prev.data AT TIME ZONE 'America/Cuiaba')::date),
        1
      );

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
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_consumo_on_cabecas_update ON public.registros_suplementacao;
CREATE TRIGGER trigger_recalc_consumo_on_cabecas_update
  AFTER UPDATE OF n_cabecas, qtd_bezerros, peso_vivo_kg
  ON public.registros_suplementacao
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_consumo_on_cabecas_update();;
