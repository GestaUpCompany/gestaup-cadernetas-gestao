CREATE OR REPLACE FUNCTION recalculate_all_quant_atual()
RETURNS VOID AS $$
DECLARE
  categoria_record RECORD;
  calc_quant_atual INTEGER;
  old_quant_atual INTEGER;
  difference INTEGER;
BEGIN
  FOR categoria_record IN 
    SELECT id, lote_id, categoria, quant_atual
    FROM lote_categorias
  LOOP
    -- Store old value for comparison
    old_quant_atual := categoria_record.quant_atual;
    
    -- Calculate new quant_atual
    calc_quant_atual := calculate_quant_atual(categoria_record.lote_id, categoria_record.categoria);
    
    -- Calculate difference
    difference := calc_quant_atual - COALESCE(old_quant_atual, 0);
    
    -- Update with new value
    UPDATE lote_categorias
    SET quant_atual = calc_quant_atual
    WHERE id = categoria_record.id;
    
    -- Log significant differences (optional, for audit)
    IF ABS(difference) > 0 THEN
      RAISE NOTICE 'Category ID %: quant_atual changed from % to % (difference: %)', 
                   categoria_record.id, old_quant_atual, calc_quant_atual, difference;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;;
