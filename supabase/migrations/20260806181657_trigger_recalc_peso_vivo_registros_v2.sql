CREATE OR REPLACE FUNCTION public.recalcular_peso_vivo_lote(p_lote_id uuid, p_ajuste_manual boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_peso_base numeric;
  v_data_inicio date;
  v_gmd numeric;
  v_data_ajuste date;
  v_peso_atual numeric;
BEGIN
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

  IF NOT FOUND OR v_gmd IS NULL THEN
    RETURN;
  END IF;

  IF v_data_ajuste IS NOT NULL AND v_peso_atual IS NOT NULL THEN
    IF p_ajuste_manual THEN
      UPDATE registros_suplementacao rs
      SET peso_vivo_kg = v_peso_atual + v_gmd * ((rs.data::date - v_data_ajuste)::integer),
          updated_at = NOW()
      WHERE rs.lote_id = p_lote_id
        AND rs.deleted_at IS NULL
        AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_atual + v_gmd * ((rs.data::date - v_data_ajuste)::integer));
    ELSE
      UPDATE registros_suplementacao rs
      SET peso_vivo_kg = v_peso_atual + v_gmd * ((rs.data::date - CURRENT_DATE)::integer),
          updated_at = NOW()
      WHERE rs.lote_id = p_lote_id
        AND rs.deleted_at IS NULL
        AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_atual + v_gmd * ((rs.data::date - CURRENT_DATE)::integer));
    END IF;
  ELSE
    IF v_peso_base IS NULL OR v_data_inicio IS NULL THEN
      RETURN;
    END IF;

    UPDATE registros_suplementacao rs
    SET peso_vivo_kg = v_peso_base + v_gmd * GREATEST((rs.data::date - v_data_inicio)::integer, 0),
        updated_at = NOW()
    WHERE rs.lote_id = p_lote_id
      AND rs.deleted_at IS NULL
      AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_base + v_gmd * GREATEST((rs.data::date - v_data_inicio)::integer, 0));
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_plano()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lote_id uuid;
BEGIN
  SELECT lc.lote_id INTO v_lote_id
  FROM lote_categorias lc
  WHERE lc.id = NEW.lote_categoria_id;

  IF v_lote_id IS NOT NULL THEN
    PERFORM recalcular_peso_vivo_lote(v_lote_id, false);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_lote_cat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.data_fim IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM recalcular_peso_vivo_lote(
    NEW.lote_id,
    NEW.data_ajuste_peso IS DISTINCT FROM OLD.data_ajuste_peso
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_formulacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lote_id uuid;
BEGIN
  FOR v_lote_id IN
    SELECT DISTINCT lc.lote_id
    FROM planos_nutricionais pn
    JOIN lote_categorias lc ON lc.id = pn.lote_categoria_id
      AND lc.ativo = true
      AND lc.data_fim IS NULL
    WHERE pn.formulacao_id = NEW.id
      AND pn.ativo = true
      AND pn.gmd_planejado IS NULL
  LOOP
    PERFORM recalcular_peso_vivo_lote(v_lote_id, false);
  END LOOP;
  RETURN NEW;
END;
$function$;;
