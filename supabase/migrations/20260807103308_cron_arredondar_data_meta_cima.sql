CREATE OR REPLACE FUNCTION public.update_dados_lotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  new_data_meta DATE;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  calc_peso_entrada_arrobas NUMERIC;
  calc_quant_atual INTEGER;
  gmd_value NUMERIC;
  peso_base NUMERIC;
  peso_meta_value NUMERIC;
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
           COALESCE(lc.peso_vivo_meta_kg_cab, pn.peso_meta_kg) AS peso_meta_efetivo,
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

    -- Recalcular data_meta_projetada: hoje + CEIL((peso_meta - peso_atual) / gmd)
    -- CEIL porque se faltam 0,5 dias, a meta so e atingida no dia seguinte
    peso_meta_value := categoria_record.peso_meta_efetivo;
    IF peso_meta_value IS NOT NULL AND new_peso_vivo IS NOT NULL AND gmd_value > 0 AND new_peso_vivo < peso_meta_value THEN
      dias_para_meta := CEIL((peso_meta_value - new_peso_vivo) / gmd_value)::INTEGER;
      new_data_meta := CURRENT_DATE + dias_para_meta;
      dias_restantes := dias_para_meta;
      IF dias_restantes < 0 THEN
        dias_restantes := 0;
      END IF;
    ELSIF peso_meta_value IS NOT NULL AND new_peso_vivo IS NOT NULL AND new_peso_vivo >= peso_meta_value THEN
      new_data_meta := CURRENT_DATE;
      dias_para_meta := 0;
      dias_restantes := 0;
    ELSE
      new_data_meta := categoria_record.data_meta_projetada;
      IF new_data_meta IS NOT NULL THEN
        dias_para_meta := (new_data_meta - CURRENT_DATE)::INTEGER;
        dias_restantes := dias_para_meta;
        IF dias_restantes < 0 THEN
          dias_restantes := 0;
        END IF;
      ELSE
        dias_restantes := NULL;
      END IF;
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
        data_meta_projetada = new_data_meta,
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
$function$;;
