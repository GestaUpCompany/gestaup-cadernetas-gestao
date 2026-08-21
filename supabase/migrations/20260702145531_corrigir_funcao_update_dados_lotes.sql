-- Corrigir função update_dados_lotes para usar os campos corretos
CREATE OR REPLACE FUNCTION update_dados_lotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  calc_peso_entrada_arrobas NUMERIC;
  calc_quant_atual INTEGER;
BEGIN
  FOR categoria_record IN 
    SELECT lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab, lc.gmd, lc.data_pesagem, lc.data_meta, lc.rc_inicial
    FROM lote_categorias lc
    WHERE lc.peso_entrada_kg_cab IS NOT NULL 
      AND lc.gmd IS NOT NULL 
      AND lc.data_pesagem IS NOT NULL
  LOOP
    -- STEP 1: Calculate periodo
    days_diff := (CURRENT_DATE - categoria_record.data_pesagem)::INTEGER;
    
    -- STEP 2: Calculate peso_vivo_kg
    new_peso_vivo := categoria_record.peso_entrada_kg_cab + (categoria_record.gmd * days_diff);
    
    -- STEP 3: Calculate dias_restantes_meta
    IF categoria_record.data_meta IS NOT NULL THEN
      dias_para_meta := (categoria_record.data_meta - categoria_record.data_pesagem)::INTEGER;
      dias_restantes := dias_para_meta - days_diff;
    ELSE
      dias_restantes := NULL;
    END IF;
    
    -- STEP 4: Calculate peso_entrada_arrobas (corrected formula with RC as percentage)
    IF categoria_record.rc_inicial IS NOT NULL THEN
      calc_peso_entrada_arrobas := (categoria_record.peso_entrada_kg_cab * (categoria_record.rc_inicial / 100)) / 15;
    ELSE
      calc_peso_entrada_arrobas := NULL;
    END IF;
    
    -- STEP 5: Calculate quant_atual using the new calculate_quant_atual function
    calc_quant_atual := calculate_quant_atual(categoria_record.lote_id, categoria_record.categoria);
    
    -- STEP 6: Update all in same transaction
    UPDATE lote_categorias
    SET periodo = days_diff,
        peso_vivo_kg = new_peso_vivo,
        dias_restantes_meta = dias_restantes,
        peso_entrada_arrobas = calc_peso_entrada_arrobas,
        quant_atual = calc_quant_atual
    WHERE id = categoria_record.id;
  END LOOP;
END;
$$;;
