
CREATE OR REPLACE FUNCTION public.encerrar_plano_nutricional(
  p_lote_categoria_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plano RECORD;
  v_snapshot jsonb;
  v_metricas jsonb;
  v_duracao integer;
  v_ganho_peso numeric;
  v_gmd_realizado numeric;
  v_gmd_planejado numeric;
  v_prod_arroba_lote numeric;
  v_mortalidade numeric;
  v_lote_id uuid;
  v_fazenda_id uuid;
  v_peso_inicio numeric;
  v_rc_inicio numeric;
  v_peso_atual numeric;
  v_rc_atual numeric;
  v_quant_atual integer;
  v_quant_inicial integer;
  v_morte integer;
BEGIN
  SELECT * INTO v_plano
  FROM public.planos_nutricionais
  WHERE lote_categoria_id = p_lote_categoria_id
    AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum plano vigente encontrado para esta categoria';
  END IF;

  SELECT to_jsonb(lc.*) INTO v_snapshot
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  SELECT lc.lote_id INTO v_lote_id
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  SELECT fazenda_id INTO v_fazenda_id
  FROM public.lotes
  WHERE id = v_lote_id;

  SELECT
    COALESCE(lc.peso_vivo_atual_kg_cab, 0),
    COALESCE(lc.rc_atual, 0),
    COALESCE(lc.quant_atual, 0),
    COALESCE(lc.quant_inicial, 0),
    COALESCE(lc.morte, 0)
  INTO v_peso_atual, v_rc_atual, v_quant_atual, v_quant_inicial, v_morte
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  v_peso_inicio := COALESCE(v_plano.peso_inicio_kg_cab, (
    SELECT lc.peso_entrada_kg_cab FROM public.lote_categorias lc WHERE lc.id = p_lote_categoria_id
  ), 0);
  v_rc_inicio := COALESCE(v_plano.rc_inicio, (
    SELECT lc.rc_inicial FROM public.lote_categorias lc WHERE lc.id = p_lote_categoria_id
  ), 0);

  v_duracao := COALESCE((CURRENT_DATE - v_plano.data_inicio)::integer, 0);

  SELECT f.gmd INTO v_gmd_planejado
  FROM public.formulacoes f
  WHERE f.id = v_plano.formulacao_id;

  v_ganho_peso := v_peso_atual - v_peso_inicio;

  IF v_ganho_peso > 0 AND v_duracao > 0 THEN
    v_gmd_realizado := v_ganho_peso / v_duracao;
  ELSE
    v_gmd_realizado := 0;
  END IF;

  IF v_quant_inicial > 0 THEN
    v_mortalidade := (v_morte::numeric / v_quant_inicial) * 100;
  ELSE
    v_mortalidade := 0;
  END IF;

  IF v_rc_atual > 0 AND v_quant_atual > 0 THEN
    v_prod_arroba_lote := ((v_peso_atual * (v_rc_atual / 100)) / 15) * v_quant_atual;
  ELSE
    v_prod_arroba_lote := 0;
  END IF;

  SELECT jsonb_build_object(
    'custo_operacional_total_cab', COALESCE(lc.custo_operacional_reais_cab_dia, 0) * v_duracao,
    'custo_total_producao_cab', COALESCE(lc.custo_total_entrada_reais_cab, 0) + (COALESCE(lc.custo_operacional_reais_cab_dia, 0) * v_duracao),
    'progresso_meta_percent', CASE
      WHEN COALESCE(v_plano.peso_meta_kg, 0) > 0
        THEN (v_peso_atual / v_plano.peso_meta_kg) * 100
      ELSE 0
    END,
    'ganho_arroba_cab', CASE
      WHEN v_rc_atual > 0 AND v_rc_inicio > 0
        THEN ((v_peso_atual * (v_rc_atual / 100)) / 15) - ((v_peso_inicio * (v_rc_inicio / 100)) / 15)
      ELSE 0
    END,
    'peso_vivo_medio_lote', v_peso_atual,
    'peso_inicial_kg_cab', v_peso_inicio,
    'rc_inicio', v_rc_inicio,
    'rc_atual', v_rc_atual,
    'quant_inicial', v_quant_inicial,
    'quant_atual', v_quant_atual,
    'morte', v_morte,
    'data_pesagem', lc.data_pesagem,
    'data_meta_projetada', lc.data_meta_projetada,
    'dias_restantes_meta', lc.dias_restantes_meta
  ) INTO v_metricas
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  INSERT INTO public.planos_nutricionais_snapshots (
    plano_nutricional_id, lote_categoria_id, fazenda_id,
    snapshot, metricas_derivadas,
    duracao_dias, ganho_peso_total_kg_cab, gmd_realizado, gmd_planejado,
    producao_arroba_lote, mortalidade_percent, motivo_migracao,
    plano_anterior_id, plano_posterior_id, tipo_snapshot
  ) VALUES (
    v_plano.id, p_lote_categoria_id, v_fazenda_id,
    v_snapshot, v_metricas,
    v_duracao, v_ganho_peso, v_gmd_realizado, v_gmd_planejado,
    v_prod_arroba_lote, v_mortalidade, 'encerramento',
    v_plano.id, NULL, 'saida'
  );

  UPDATE public.planos_nutricionais
  SET ativo = false, data_fim = CURRENT_DATE
  WHERE id = v_plano.id;

  UPDATE public.lote_categorias
  SET formulacao_id = NULL,
      estrategia_nutricional = NULL,
      peso_vivo_meta_kg_cab = NULL,
      gmd = NULL,
      consumo_meta_porcentagem_pesovivo = NULL
  WHERE id = p_lote_categoria_id;
END;
$function$;
;
