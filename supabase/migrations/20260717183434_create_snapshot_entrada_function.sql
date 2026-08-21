CREATE OR REPLACE FUNCTION public.criar_snapshot_entrada(
  p_plano_id uuid,
  p_lote_categoria_id uuid,
  p_motivo text DEFAULT 'inicio'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plano RECORD;
  v_snapshot jsonb;
  v_metricas jsonb;
  v_lote_id uuid;
  v_fazenda_id uuid;
  v_peso_atual numeric;
  v_rc_atual numeric;
  v_quant_atual integer;
  v_quant_inicial integer;
  v_morte integer;
  v_gmd_planejado numeric;
BEGIN
  SELECT * INTO v_plano
  FROM public.planos_nutricionais
  WHERE id = p_plano_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano não encontrado';
  END IF;

  -- Snapshot do estado de lote_categorias
  SELECT to_jsonb(lc.*) INTO v_snapshot
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  -- Buscar dados auxiliares
  SELECT lc.lote_id INTO v_lote_id
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  SELECT fazenda_id INTO v_fazenda_id
  FROM public.lotes
  WHERE id = v_lote_id;

  -- Estado atual da categoria
  SELECT
    COALESCE(lc.peso_vivo_atual_kg_cab, 0),
    COALESCE(lc.rc_atual, 0),
    COALESCE(lc.quant_atual, 0),
    COALESCE(lc.quant_inicial, 0),
    COALESCE(lc.morte, 0)
  INTO v_peso_atual, v_rc_atual, v_quant_atual, v_quant_inicial, v_morte
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  -- GMD planejado
  SELECT f.gmd INTO v_gmd_planejado
  FROM public.formulacoes f
  WHERE f.id = v_plano.formulacao_id;

  -- Métricas de entrada (estado inicial, sem ganho)
  SELECT jsonb_build_object(
    'custo_operacional_total_cab', 0,
    'custo_total_producao_cab', COALESCE(lc.custo_total_entrada_reais_cab, 0),
    'progresso_meta_percent', CASE
      WHEN COALESCE(v_plano.peso_meta_kg, 0) > 0
        THEN (v_peso_atual / v_plano.peso_meta_kg) * 100
      ELSE 0
    END,
    'ganho_arroba_cab', 0,
    'peso_vivo_medio_lote', v_peso_atual,
    'peso_inicial_kg_cab', v_peso_atual,
    'rc_inicio', v_rc_atual,
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

  -- Produção atual do lote em arrobas
  DECLARE
    v_prod_arroba numeric;
  BEGIN
    IF v_rc_atual > 0 AND v_quant_atual > 0 THEN
      v_prod_arroba := ((v_peso_atual * (v_rc_atual / 100)) / 15) * v_quant_atual;
    ELSE
      v_prod_arroba := 0;
    END IF;

    INSERT INTO public.planos_nutricionais_snapshots (
      plano_nutricional_id, lote_categoria_id, fazenda_id,
      snapshot, metricas_derivadas,
      duracao_dias, ganho_peso_total_kg_cab, gmd_realizado, gmd_planejado,
      producao_arroba_lote, mortalidade_percent, motivo_migracao,
      plano_anterior_id, plano_posterior_id, tipo_snapshot
    ) VALUES (
      p_plano_id, p_lote_categoria_id, v_fazenda_id,
      v_snapshot, v_metricas,
      0, 0, 0, v_gmd_planejado,
      v_prod_arroba,
      CASE WHEN v_quant_inicial > 0 THEN (v_morte::numeric / v_quant_inicial) * 100 ELSE 0 END,
      p_motivo,
      NULL, NULL, 'entrada'
    );
  END;
END;
$$;;
