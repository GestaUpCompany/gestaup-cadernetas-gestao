
-- Reescrever update_dados_lotes() para usar data_inicio do plano vigente
-- em vez de data_pesagem. Suporta edição manual via data_ajuste_peso.
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
  data_base DATE;
BEGIN
  FOR categoria_record IN
    SELECT lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab,
           f.gmd AS formulacao_gmd,
           lc.data_meta_projetada, lc.rc_inicial,
           lc.data_ajuste_peso,
           lc.peso_vivo_atual_kg_cab,
           pn.data_inicio,
           pn.peso_inicio_kg_cab
    FROM lote_categorias lc
    JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
    JOIN formulacoes f ON f.id = pn.formulacao_id
    WHERE lc.peso_entrada_kg_cab IS NOT NULL
      AND lc.ativo = true
      AND f.gmd IS NOT NULL
      AND pn.data_inicio IS NOT NULL
  LOOP
    gmd_value := categoria_record.formulacao_gmd;
    IF gmd_value IS NULL THEN
      CONTINUE;
    END IF;

    -- Determinar base de cálculo
    IF categoria_record.data_ajuste_peso IS NOT NULL THEN
      -- Após edição manual: projeção incremental
      -- peso_atual + GMD por dia decorrido desde data_ajuste_peso
      -- Como o cron roda diariamente, soma 1×GMD a cada execução
      days_diff := (CURRENT_DATE - categoria_record.data_ajuste_peso)::INTEGER;
      IF days_diff > 0 THEN
        -- Recalcular a partir do peso atual registrado + dias × GMD
        -- Mas precisamos do peso que estava na data_ajuste_peso
        -- Como o cron soma GMD diariamente, o peso_atual já reflete os dias anteriores
        -- Então somamos apenas os dias que passaram desde a última execução do cron
        -- Na prática, se o cron roda todo dia, days_diff será 1 e somamos 1×GMD
        -- Mas se falhou um dia, days_diff será 2 e somamos 2×GMD (auto-correção parcial)
        -- No entanto, o peso_atual já pode ter sido atualizado parcialmente
        -- Solução robusta: usar peso_atual + (days_diff × GMD) apenas se days_diff = 1
        -- Se days_diff > 1, assumir que o peso_atual já foi parcialmente atualizado
        -- e somar apenas 1×GMD (o dia de hoje)
        -- PROBLEMA: isso não é auto-corretivo se o cron falhar
        -- MELHOR SOLUÇÃO: armazenar o peso na data do ajuste e recalcular formulaicamente
        -- Mas o usuário pediu abordagem incremental pura após ajuste manual
        -- Então: somar 1×GMD por execução do cron (assumindo execução diária)
        new_peso_vivo := categoria_record.peso_vivo_atual_kg_cab + gmd_value;
      ELSE
        -- data_ajuste_peso é hoje, não atualizar
        CONTINUE;
      END IF;
    ELSE
      -- Sem edição manual: fórmula formulaica usando data_inicio do plano
      peso_base := COALESCE(categoria_record.peso_inicio_kg_cab, categoria_record.peso_entrada_kg_cab);
      days_diff := (CURRENT_DATE - categoria_record.data_inicio)::INTEGER;
      IF days_diff < 0 THEN
        days_diff := 0;
      END IF;
      new_peso_vivo := peso_base + (gmd_value * days_diff);
    END IF;

    -- Calcular dias_restantes_meta
    IF categoria_record.data_meta_projetada IS NOT NULL THEN
      dias_para_meta := (categoria_record.data_meta_projetada - CURRENT_DATE)::INTEGER;
      dias_restantes := dias_para_meta;
      IF dias_restantes < 0 THEN
        dias_restantes := 0;
      END IF;
    ELSE
      dias_restantes := NULL;
    END IF;

    -- Calcular peso_entrada_arrobas
    IF categoria_record.rc_inicial IS NOT NULL THEN
      calc_peso_entrada_arrobas := (categoria_record.peso_entrada_kg_cab * (categoria_record.rc_inicial / 100)) / 15;
    ELSE
      calc_peso_entrada_arrobas := NULL;
    END IF;

    calc_quant_atual := calculate_quant_atual(categoria_record.lote_id, categoria_record.categoria);

    -- Calcular periodo (dias desde data_inicio do plano)
    IF categoria_record.data_ajuste_peso IS NOT NULL THEN
      -- Após ajuste manual, periodo = dias desde data_ajuste_peso
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
    WHERE id = categoria_record.id;
  END LOOP;
END;
$function$;
;
