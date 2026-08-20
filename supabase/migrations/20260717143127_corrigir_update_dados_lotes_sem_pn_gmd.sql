
-- Corrige update_dados_lotes() para não referenciar pn.gmd (coluna não existe)
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
BEGIN
  FOR categoria_record IN
    SELECT lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab,
           f.gmd AS formulacao_gmd,
           lc.data_pesagem, lc.data_meta_projetada, lc.rc_inicial
    FROM lote_categorias lc
    LEFT JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
    LEFT JOIN formulacoes f ON f.id = pn.formulacao_id
    WHERE lc.peso_entrada_kg_cab IS NOT NULL
      AND lc.data_pesagem IS NOT NULL
      AND lc.ativo = true
      AND f.gmd IS NOT NULL
  LOOP
    gmd_value := categoria_record.formulacao_gmd;
    IF gmd_value IS NULL THEN
      CONTINUE;
    END IF;

    days_diff := (CURRENT_DATE - categoria_record.data_pesagem)::INTEGER;
    new_peso_vivo := categoria_record.peso_entrada_kg_cab + (gmd_value * days_diff);

    IF categoria_record.data_meta_projetada IS NOT NULL THEN
      dias_para_meta := (categoria_record.data_meta_projetada - categoria_record.data_pesagem)::INTEGER;
      dias_restantes := dias_para_meta - days_diff;
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
    WHERE id = categoria_record.id;
  END LOOP;
END;
$function$;
;
