-- Migration N: Rewrite cron update_dados_lotes para novo modelo por lote
-- - JOIN por lote_id (nao lote_categoria_id)
-- - LEFT JOIN com plano_categoria_personalizacao para periodo e peso meta por categoria
-- - Interrompe ganho de peso quando periodo ou peso meta sao atingidos
-- - Remove migracao automatica
-- - Bezerros ao pe em loop separado (sem plano, GMD proprio)

CREATE OR REPLACE FUNCTION public.update_dados_lotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  dias_desde_inicio INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  calc_peso_entrada_arrobas NUMERIC;
  calc_quant_atual INTEGER;
  gmd_value NUMERIC;
  peso_base NUMERIC;
  v_data_inicio date;
  v_periodo_cat INTEGER;
  v_peso_meta_cat NUMERIC;
BEGIN
  -- Categorias normais (com plano do lote)
  FOR categoria_record IN
    SELECT
      lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab,
      NULLIF(lc.gmd, '')::numeric AS gmd_efetivo,
      lc.data_meta_projetada, lc.rc_inicial,
      lc.data_ajuste_peso, lc.peso_vivo_atual_kg_cab,
      lc.data_pesagem, lc.created_at,
      pn.id AS plano_id, pn.data_inicio, pn.peso_inicio_kg_cab,
      COALESCE(pcp.periodo_dias, pn.periodo_dias) AS periodo_cat,
      COALESCE(pcp.peso_meta_kg, pn.peso_meta_kg) AS peso_meta_cat
    FROM lote_categorias lc
    LEFT JOIN planos_nutricionais pn
      ON pn.lote_id = lc.lote_id AND pn.ativo = true AND pn.data_fim IS NULL
    LEFT JOIN plano_categoria_personalizacao pcp
      ON pcp.plano_id = pn.id AND pcp.lote_categoria_id = lc.id AND pcp.ativo = true
    WHERE lc.peso_entrada_kg_cab IS NOT NULL
      AND lc.ativo = true
      AND lc.data_fim IS NULL
      AND NULLIF(lc.gmd, '')::numeric IS NOT NULL
      AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerro ao pe'
      AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerra ao pe'
  LOOP
    gmd_value := categoria_record.gmd_efetivo;
    IF gmd_value IS NULL THEN
      CONTINUE;
    END IF;

    v_data_inicio := COALESCE(
      categoria_record.data_inicio,
      categoria_record.data_pesagem,
      categoria_record.created_at::date
    );

    v_periodo_cat := categoria_record.periodo_cat;
    v_peso_meta_cat := categoria_record.peso_meta_cat;

    -- Dias desde inicio do plano (para controle de periodo)
    dias_desde_inicio := (CURRENT_DATE - v_data_inicio)::INTEGER;
    IF dias_desde_inicio < 0 THEN
      dias_desde_inicio := 0;
    END IF;

    -- Verificar se o periodo da categoria ja foi atingido
    IF v_periodo_cat IS NOT NULL AND dias_desde_inicio >= v_periodo_cat THEN
      -- Periodo atingido: travar peso, nao projetar mais
      IF categoria_record.data_ajuste_peso IS NOT NULL THEN
        new_peso_vivo := categoria_record.peso_vivo_atual_kg_cab;
      ELSE
        peso_base := COALESCE(categoria_record.peso_inicio_kg_cab, categoria_record.peso_entrada_kg_cab);
        new_peso_vivo := peso_base + (gmd_value * v_periodo_cat);
      END IF;
      -- Verificar peso meta
      IF v_peso_meta_cat IS NOT NULL AND new_peso_vivo > v_peso_meta_cat THEN
        new_peso_vivo := v_peso_meta_cat;
      END IF;
      days_diff := v_periodo_cat;
    ELSE
      -- Periodo nao atingido: projetar peso normalmente
      IF categoria_record.data_ajuste_peso IS NOT NULL THEN
        days_diff := (CURRENT_DATE - categoria_record.data_ajuste_peso)::INTEGER;
        IF days_diff > 0 THEN
          new_peso_vivo := categoria_record.peso_vivo_atual_kg_cab + gmd_value;
        ELSE
          CONTINUE;
        END IF;
      ELSE
        peso_base := COALESCE(categoria_record.peso_inicio_kg_cab, categoria_record.peso_entrada_kg_cab);
        days_diff := dias_desde_inicio;
        new_peso_vivo := peso_base + (gmd_value * days_diff);
      END IF;
      -- Verificar peso meta
      IF v_peso_meta_cat IS NOT NULL AND new_peso_vivo >= v_peso_meta_cat THEN
        new_peso_vivo := v_peso_meta_cat;
      END IF;
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

    UPDATE lote_categorias
    SET periodo = days_diff,
        dias_restantes_meta = dias_restantes,
        peso_entrada_arrobas = calc_peso_entrada_arrobas,
        quant_atual = calc_quant_atual,
        peso_vivo_atual_kg_cab = new_peso_vivo,
        gmd = gmd_value::text
    WHERE id = categoria_record.id
      AND data_fim IS NULL;
  END LOOP;

  -- Bezerros ao pe: projecao simples com GMD proprio, sem plano
  FOR categoria_record IN
    SELECT
      lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab,
      NULLIF(lc.gmd, '')::numeric AS gmd_efetivo,
      lc.data_meta_projetada, lc.rc_inicial,
      lc.data_ajuste_peso, lc.peso_vivo_atual_kg_cab,
      lc.data_pesagem, lc.created_at
    FROM lote_categorias lc
    WHERE lc.peso_entrada_kg_cab IS NOT NULL
      AND lc.ativo = true
      AND lc.data_fim IS NULL
      AND NULLIF(lc.gmd, '')::numeric IS NOT NULL
      AND (LOWER(unaccent(lc.categoria)) ILIKE 'bezerro ao pe' OR LOWER(unaccent(lc.categoria)) ILIKE 'bezerra ao pe')
  LOOP
    gmd_value := categoria_record.gmd_efetivo;
    v_data_inicio := COALESCE(categoria_record.data_pesagem, categoria_record.created_at::date);
    peso_base := categoria_record.peso_entrada_kg_cab;
    days_diff := (CURRENT_DATE - v_data_inicio)::INTEGER;
    IF days_diff < 0 THEN
      days_diff := 0;
    END IF;
    new_peso_vivo := peso_base + (gmd_value * days_diff);

    IF categoria_record.rc_inicial IS NOT NULL THEN
      calc_peso_entrada_arrobas := (categoria_record.peso_entrada_kg_cab * (categoria_record.rc_inicial / 100)) / 15;
    ELSE
      calc_peso_entrada_arrobas := NULL;
    END IF;

    calc_quant_atual := calculate_quant_atual(categoria_record.lote_id, categoria_record.categoria);

    UPDATE lote_categorias
    SET periodo = days_diff,
        peso_entrada_arrobas = calc_peso_entrada_arrobas,
        quant_atual = calc_quant_atual,
        peso_vivo_atual_kg_cab = new_peso_vivo,
        gmd = gmd_value::text
    WHERE id = categoria_record.id
      AND data_fim IS NULL;
  END LOOP;
END;
$func$;
