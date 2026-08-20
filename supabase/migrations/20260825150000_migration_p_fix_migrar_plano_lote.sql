-- Migration P: Fix migrar_plano_lote para usar formulacao_categorias_gmd e unaccent
-- - GMD por categoria em vez de gmd_planejado/f.gmd
-- - unaccent para filtrar bezerros ao pé com acento

CREATE OR REPLACE FUNCTION public.migrar_plano_lote(p_lote_id uuid, p_plano_destino_id uuid, p_motivo text DEFAULT 'manual'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_plano_atual RECORD;
  v_plano_destino RECORD;
  v_lote RECORD;
  v_fazenda_id uuid;
  v_cat RECORD;
  v_gmd_proximo numeric;
  v_form_proximo RECORD;
BEGIN
  SELECT * INTO v_lote FROM public.lotes WHERE id = p_lote_id;
  v_fazenda_id := v_lote.fazenda_id;

  SELECT * INTO v_plano_atual FROM public.planos_nutricionais
  WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nenhum plano vigente encontrado para este lote'; END IF;

  SELECT * INTO v_plano_destino FROM public.planos_nutricionais
  WHERE id = p_plano_destino_id AND lote_id = p_lote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano destino nao encontrado para este lote'; END IF;
  IF v_plano_destino.data_fim IS NOT NULL THEN RAISE EXCEPTION 'Nao e possivel migrar para um plano ja encerrado'; END IF;

  PERFORM public.encerrar_plano_lote(p_lote_id);

  IF v_plano_destino.id != (SELECT id FROM public.planos_nutricionais WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL LIMIT 1) THEN
    UPDATE public.planos_nutricionais SET ativo = false, data_inicio = NULL WHERE lote_id = p_lote_id AND ativo = true AND id != v_plano_destino.id;
    UPDATE public.planos_nutricionais SET ativo = true, data_inicio = CURRENT_DATE, data_fim = NULL WHERE id = v_plano_destino.id;
    UPDATE public.lotes SET formulacao_id = v_plano_destino.formulacao_id WHERE id = p_lote_id;
    SELECT * INTO v_form_proximo FROM public.formulacoes WHERE id = v_plano_destino.formulacao_id;

    FOR v_cat IN SELECT * FROM public.lote_categorias
      WHERE lote_id = p_lote_id AND ativo = true AND data_fim IS NULL
        AND LOWER(unaccent(categoria)) NOT ILIKE 'bezerro ao pe'
        AND LOWER(unaccent(categoria)) NOT ILIKE 'bezerra ao pe'
    LOOP
      SELECT fcg.gmd INTO v_gmd_proximo FROM public.formulacao_categorias_gmd fcg
      WHERE fcg.formulacao_id = v_plano_destino.formulacao_id AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(v_cat.categoria));
      IF NOT FOUND THEN v_gmd_proximo := NULL; END IF;

      UPDATE public.lote_categorias
      SET formulacao_id = v_plano_destino.formulacao_id,
          estrategia_nutricional = v_form_proximo.nome,
          peso_vivo_meta_kg_cab = v_plano_destino.peso_meta_kg,
          gmd = CASE WHEN v_gmd_proximo IS NOT NULL THEN v_gmd_proximo::text ELSE NULL END,
          consumo_meta_porcentagem_pesovivo = v_form_proximo.consumo_ms_percent_pv
      WHERE id = v_cat.id;

      INSERT INTO public.plano_categoria_personalizacao (plano_id, lote_categoria_id, periodo_dias, peso_meta_kg, ativo)
      VALUES (v_plano_destino.id, v_cat.id, v_plano_destino.periodo_dias, v_plano_destino.peso_meta_kg, true)
      ON CONFLICT (plano_id, lote_categoria_id) DO UPDATE SET ativo = true;
    END LOOP;
  END IF;
END;
$func$;
