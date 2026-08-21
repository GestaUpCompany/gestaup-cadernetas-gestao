-- ============================================================================
-- MIGRATION Z3 — iniciar_plano_lote captura peso_inicio_kg_cab por categoria
-- ============================================================================

CREATE OR REPLACE FUNCTION public.iniciar_plano_lote(p_lote_id uuid, p_plano_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plano RECORD; v_lote RECORD; v_fazenda_id uuid; v_cat RECORD; v_gmd numeric; v_form RECORD;
BEGIN
  SELECT * INTO v_lote FROM public.lotes WHERE id = p_lote_id;
  v_fazenda_id := v_lote.fazenda_id;
  IF p_plano_id IS NULL THEN
    SELECT * INTO v_plano FROM public.planos_nutricionais WHERE lote_id = p_lote_id AND data_fim IS NULL AND data_inicio IS NULL ORDER BY ordem ASC LIMIT 1;
  ELSE
    SELECT * INTO v_plano FROM public.planos_nutricionais WHERE id = p_plano_id AND lote_id = p_lote_id;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nenhum plano disponivel para iniciar'; END IF;

  UPDATE public.planos_nutricionais SET ativo = true, data_inicio = CURRENT_DATE, data_fim = NULL WHERE id = v_plano.id;
  UPDATE public.lotes SET formulacao_id = v_plano.formulacao_id WHERE id = p_lote_id;
  SELECT * INTO v_form FROM public.formulacoes WHERE id = v_plano.formulacao_id;

  FOR v_cat IN SELECT * FROM public.lote_categorias
    WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL
      AND LOWER(unaccent(categoria)) NOT ILIKE 'bezerro ao pe'
      AND LOWER(unaccent(categoria)) NOT ILIKE 'bezerra ao pe'
  LOOP
    SELECT fcg.gmd INTO v_gmd FROM public.formulacao_categorias_gmd fcg
    WHERE fcg.formulacao_id = v_plano.formulacao_id AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(v_cat.categoria));
    IF NOT FOUND THEN v_gmd := NULL; END IF;

    UPDATE public.lote_categorias
    SET formulacao_id = v_plano.formulacao_id,
        estrategia_nutricional = v_form.nome,
        peso_vivo_meta_kg_cab = v_plano.peso_meta_kg,
        gmd = CASE WHEN v_gmd IS NOT NULL THEN v_gmd::text ELSE NULL END,
        consumo_meta_porcentagem_pesovivo = v_form.consumo_ms_percent_pv
    WHERE id = v_cat.id;

    INSERT INTO public.plano_categoria_personalizacao (plano_id, lote_categoria_id, periodo_dias, peso_meta_kg, peso_inicio_kg_cab, ativo)
    VALUES (v_plano.id, v_cat.id, v_plano.periodo_dias, v_plano.peso_meta_kg, v_cat.peso_vivo_atual_kg_cab, true)
    ON CONFLICT (plano_id, lote_categoria_id) DO UPDATE
    SET ativo = true,
        peso_inicio_kg_cab = EXCLUDED.peso_inicio_kg_cab;

    PERFORM public.criar_snapshot_entrada(v_plano.id, v_cat.id, 'inicio_lote');
  END LOOP;
END;
$function$;
