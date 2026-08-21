CREATE OR REPLACE FUNCTION update_peso_vivo_lotes()
RETURNS void AS $$
DECLARE
  lote_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
BEGIN
  FOR lote_record IN 
    SELECT id, peso_entrada, gmd, data_pesagem
    FROM lotes
    WHERE peso_entrada IS NOT NULL 
      AND gmd IS NOT NULL 
      AND data_pesagem IS NOT NULL
  LOOP
    -- STEP 1: Calculate periodo first
    days_diff := (CURRENT_DATE - lote_record.data_pesagem)::INTEGER;
    
    -- STEP 2: Calculate peso_vivo_kg using fresh periodo
    new_peso_vivo := lote_record.peso_entrada + (lote_record.gmd * days_diff);
    
    -- STEP 3: Update both in same transaction
    UPDATE lotes
    SET periodo = days_diff,
        peso_vivo_kg = new_peso_vivo
    WHERE id = lote_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;;
