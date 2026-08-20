
-- Reescrever update_dados_lotes() para incluir verificação automática de meta por peso
-- Após atualizar o peso, se condicao_migracao for 'peso' ou 'ambos' e migracao_automatica for true,
-- verifica se o peso atual atingiu ou ultrapassou o peso_meta_kg do plano.
-- Se houver próximo plano, migra; se for o último, encerra.

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
           f.gmd AS formulacao_gmd,
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
      days_diff := (CURRENT_DATE - categoria_record.data_ajuste_peso)::INTEGER;
      IF days_diff > 0 THEN
        new_peso_vivo := categoria_record.peso_vivo_atual_kg_cab + gmd_value;
      ELSE
        CONTINUE;
      END IF;
    ELSE
      -- Sem edição manual: fórmula usando data_inicio do plano
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

    -- Calcular periodo
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
    WHERE id = categoria_record.id;

    -- Verificar meta por peso (condicao_migracao = 'peso' ou 'ambos' e migracao_automatica = true)
    IF categoria_record.migracao_automatica = true
       AND categoria_record.condicao_migracao IN ('peso', 'ambos')
       AND categoria_record.peso_meta_kg IS NOT NULL
       AND new_peso_vivo >= categoria_record.peso_meta_kg
    THEN
      -- Verificar se existe próximo plano não encerrado
      SELECT EXISTS(
        SELECT 1 FROM planos_nutricionais
        WHERE lote_categoria_id = categoria_record.id
          AND data_fim IS NULL
          AND ordem > categoria_record.ordem
      ) INTO v_tem_proximo;

      v_plano_id := categoria_record.plano_id;
      v_lote_categoria_id := categoria_record.id;

      IF v_tem_proximo THEN
        -- Migrar para o próximo plano
        PERFORM migrar_plano_nutricional(v_lote_categoria_id, NULL, 'meta_peso');
      ELSE
        -- Último plano: encerrar
        PERFORM encerrar_plano_nutricional(v_lote_categoria_id);
      END IF;
    END IF;
  END LOOP;
END;
$function$;
;
