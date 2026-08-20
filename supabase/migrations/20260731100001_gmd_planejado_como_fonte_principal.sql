-- Migration: usar gmd_planejado do plano nutricional como fonte principal de GMD
-- Antes: cron e migrar_plano_nutricional usavam f.gmd (formulação), ignorando pn.gmd_planejado
-- Agora: COALESCE(pn.gmd_planejado, f.gmd) - o GMD digitado no plano tem prioridade,
-- com fallback para o GMD da formulação se o plano não tiver gmd_planejado definido.

-- ============================================================
-- 1. update_dados_lotes: usar COALESCE(pn.gmd_planejado, f.gmd)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_dados_lotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  calc_peso_entrada_arrobas NUMERIC;
  calc_quant_atual INTEGER;
  gmd_value NUMERIC;
  peso_base NUMERIC;
  v_tem_proximo BOOLEAN;
  v_plano_id uuid;
  v_lote_categoria_id uuid;
BEGIN
  FOR categoria_record IN
    SELECT lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab,
           COALESCE(pn.gmd_planejado, f.gmd) AS gmd_efetivo,
           lc.data_meta_projetada, lc.rc_inicial,
           lc.data_ajuste_peso,
           lc.peso_vivo_atual_kg_cab,
           pn.id AS plano_id,
           pn.data_inicio,
           pn.peso_inicio_kg_cab,
           pn.peso_meta_kg,
           pn.condicao_migracao,
           pn.migracao_automatica,
           pn.ordem
    FROM lote_categorias lc
    JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
    JOIN formulacoes f ON f.id = pn.formulacao_id
    WHERE lc.peso_entrada_kg_cab IS NOT NULL
      AND lc.ativo = true
      AND lc.data_fim IS NULL
      AND pn.data_inicio IS NOT NULL
      AND COALESCE(pn.gmd_planejado, f.gmd) IS NOT NULL
  LOOP
    gmd_value := categoria_record.gmd_efetivo;
    IF gmd_value IS NULL THEN
      CONTINUE;
    END IF;

    IF categoria_record.data_ajuste_peso IS NOT NULL THEN
      days_diff := (CURRENT_DATE - categoria_record.data_ajuste_peso)::INTEGER;
      IF days_diff > 0 THEN
        new_peso_vivo := categoria_record.peso_vivo_atual_kg_cab + gmd_value;
      ELSE
        CONTINUE;
      END IF;
    ELSE
      peso_base := COALESCE(categoria_record.peso_inicio_kg_cab, categoria_record.peso_entrada_kg_cab);
      days_diff := (CURRENT_DATE - categoria_record.data_inicio)::INTEGER;
      IF days_diff < 0 THEN
        days_diff := 0;
      END IF;
      new_peso_vivo := peso_base + (gmd_value * days_diff);
    END IF;

    IF categoria_record.data_meta_projetada IS NOT NULL THEN
      dias_para_meta := (categoria_record.data_meta_projetada - CURRENT_DATE)::INTEGER;
      dias_restantes := dias_para_meta;
      IF dias_restantes < 0 THEN
        dias_restantes := 0;
      END IF;
    ELSE
      dias_restantes := NULL;
    END IF;

    IF categoria_record.rc_inicial IS NOT NULL THEN
      calc_peso_entrada_arrobas := (categoria_record.peso_entrada_kg_cab * (categoria_record.rc_inicial / 100)) / 15;
    ELSE
      calc_peso_entrada_arrobas := NULL;
    END IF;

    calc_quant_atual := calculate_quant_atual(categoria_record.lote_id, categoria_record.categoria);

    IF categoria_record.data_ajuste_peso IS NOT NULL THEN
      days_diff := (CURRENT_DATE - categoria_record.data_ajuste_peso)::INTEGER;
      IF days_diff < 0 THEN days_diff := 0; END IF;
    END IF;

    UPDATE lote_categorias
    SET periodo = days_diff,
        dias_restantes_meta = dias_restantes,
        peso_entrada_arrobas = calc_peso_entrada_arrobas,
        quant_atual = calc_quant_atual,
        peso_vivo_atual_kg_cab = new_peso_vivo,
        gmd = gmd_value::text
    WHERE id = categoria_record.id
      AND data_fim IS NULL;

    IF categoria_record.migracao_automatica = true
       AND categoria_record.condicao_migracao IN ('peso', 'ambos')
       AND categoria_record.peso_meta_kg IS NOT NULL
       AND new_peso_vivo >= categoria_record.peso_meta_kg
    THEN
      SELECT EXISTS(
        SELECT 1 FROM planos_nutricionais
        WHERE lote_categoria_id = categoria_record.id
          AND data_fim IS NULL
          AND ordem > categoria_record.ordem
      ) INTO v_tem_proximo;

      v_plano_id := categoria_record.plano_id;
      v_lote_categoria_id := categoria_record.id;

      IF v_tem_proximo THEN
        PERFORM migrar_plano_nutricional(v_lote_categoria_id, NULL, 'meta_peso');
      ELSE
        PERFORM encerrar_plano_nutricional(v_lote_categoria_id);
      END IF;
    END IF;
  END LOOP;
END;
$function$;

-- ============================================================
-- 2. migrar_plano_nutricional: usar gmd_planejado do plano em vez de f.gmd
-- ============================================================
CREATE OR REPLACE FUNCTION public.migrar_plano_nutricional(p_lote_categoria_id uuid, p_plano_destino_id uuid DEFAULT NULL::uuid, p_motivo text DEFAULT 'manual'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_plano_atual RECORD;
  v_proximo_plano RECORD;
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
  v_categoria text;
  v_peso_inicio numeric;
  v_rc_inicio numeric;
  v_peso_atual numeric;
  v_rc_atual numeric;
  v_quant_atual integer;
  v_quant_inicial integer;
  v_morte integer;
  v_gmd_proximo numeric;
BEGIN
  -- Buscar plano vigente
  SELECT * INTO v_plano_atual
  FROM public.planos_nutricionais
  WHERE lote_categoria_id = p_lote_categoria_id
    AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_plano_atual
    FROM public.planos_nutricionais
    WHERE lote_categoria_id = p_lote_categoria_id
    ORDER BY ordem ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nenhum plano nutricional encontrado para esta categoria';
    END IF;

    UPDATE public.planos_nutricionais
    SET ativo = true, data_inicio = CURRENT_DATE
    WHERE id = v_plano_atual.id;
  END IF;

  -- Definir plano destino
  IF p_plano_destino_id IS NOT NULL THEN
    SELECT * INTO v_proximo_plano
    FROM public.planos_nutricionais
    WHERE id = p_plano_destino_id
      AND lote_categoria_id = p_lote_categoria_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Plano destino não encontrado para esta categoria';
    END IF;

    IF v_proximo_plano.data_fim IS NOT NULL THEN
      RAISE EXCEPTION 'Não é possível migrar para um plano já encerrado';
    END IF;
  ELSE
    SELECT * INTO v_proximo_plano
    FROM public.planos_nutricionais
    WHERE lote_categoria_id = p_lote_categoria_id
      AND ordem > v_plano_atual.ordem
      AND data_inicio IS NULL
    ORDER BY ordem ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Não há próximo plano para migração automática';
    END IF;
  END IF;

  IF v_plano_atual.id = v_proximo_plano.id THEN
    RAISE EXCEPTION 'O plano destino é o mesmo que o plano vigente';
  END IF;

  -- Snapshot do estado completo de lote_categorias
  SELECT to_jsonb(lc.*) INTO v_snapshot
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id;

  SELECT lc.lote_id, lc.categoria INTO v_lote_id, v_categoria
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

  -- Baseline do plano
  v_peso_inicio := COALESCE(v_plano_atual.peso_inicio_kg_cab, (
    SELECT lc.peso_entrada_kg_cab FROM public.lote_categorias lc WHERE lc.id = p_lote_categoria_id
  ), 0);
  v_rc_inicio := COALESCE(v_plano_atual.rc_inicio, (
    SELECT lc.rc_inicial FROM public.lote_categorias lc WHERE lc.id = p_lote_categoria_id
  ), 0);

  v_duracao := COALESCE((CURRENT_DATE - v_plano_atual.data_inicio)::integer, 0);

  -- GMD planejado: priorizar gmd_planejado do plano, com fallback para formulação
  SELECT COALESCE(v_plano_atual.gmd_planejado, f.gmd) INTO v_gmd_planejado
  FROM public.formulacoes f
  WHERE f.id = v_plano_atual.formulacao_id;

  -- Métricas de saída
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
      WHEN COALESCE(v_plano_atual.peso_meta_kg, 0) > 0
        THEN (v_peso_atual / v_plano_atual.peso_meta_kg) * 100
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

  -- Snapshot de SAÍDA do plano atual
  INSERT INTO public.planos_nutricionais_snapshots (
    plano_nutricional_id, lote_categoria_id, fazenda_id,
    snapshot, metricas_derivadas,
    duracao_dias, ganho_peso_total_kg_cab, gmd_realizado, gmd_planejado,
    producao_arroba_lote, mortalidade_percent, motivo_migracao,
    plano_anterior_id, plano_posterior_id, tipo_snapshot
  ) VALUES (
    v_plano_atual.id, p_lote_categoria_id, v_fazenda_id, v_snapshot, v_metricas,
    v_duracao, v_ganho_peso, v_gmd_realizado, v_gmd_planejado,
    v_prod_arroba_lote, v_mortalidade, p_motivo,
    v_plano_atual.id, v_proximo_plano.id, 'saida'
  );

  -- Desativar plano atual
  UPDATE public.planos_nutricionais
  SET ativo = false, data_fim = CURRENT_DATE
  WHERE id = v_plano_atual.id;

  -- Ativar próximo plano com baseline
  UPDATE public.planos_nutricionais
  SET ativo = true, data_inicio = CURRENT_DATE,
      peso_inicio_kg_cab = v_peso_atual,
      rc_inicio = v_rc_atual
  WHERE id = v_proximo_plano.id;

  -- Criar snapshot de ENTRADA do próximo plano
  PERFORM public.criar_snapshot_entrada(v_proximo_plano.id, p_lote_categoria_id, 'migracao');

  -- GMD do próximo plano: priorizar gmd_planejado, com fallback para formulação
  SELECT COALESCE(v_proximo_plano.gmd_planejado, f.gmd) INTO v_gmd_proximo
  FROM public.formulacoes f
  WHERE f.id = v_proximo_plano.formulacao_id;

  -- Atualizar lote_categorias
  UPDATE public.lote_categorias lc
  SET
    formulacao_id = v_proximo_plano.formulacao_id,
    estrategia_nutricional = f.nome,
    peso_vivo_meta_kg_cab = v_proximo_plano.peso_meta_kg,
    gmd = v_gmd_proximo::text,
    consumo_meta_porcentagem_pesovivo = f.meta_consumo_ms_percent_pv
  FROM public.formulacoes f
  WHERE lc.id = p_lote_categoria_id
    AND f.id = v_proximo_plano.formulacao_id;
END;
$function$;
