
CREATE OR REPLACE FUNCTION public.update_peso_vivo_lotes()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  lote_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
BEGIN
  FOR lote_record IN 
    SELECT id, peso_entrada, gmd, data_pesagem, data_meta
    FROM lotes
    WHERE peso_entrada IS NOT NULL 
      AND gmd IS NOT NULL 
      AND data_pesagem IS NOT NULL
  LOOP
    -- STEP 1: Calculate periodo first
    days_diff := (CURRENT_DATE - lote_record.data_pesagem)::INTEGER;
    
    -- STEP 2: Calculate peso_vivo_kg using fresh periodo
    new_peso_vivo := lote_record.peso_entrada + (lote_record.gmd * days_diff);
    
    -- STEP 3: Calculate dias_restantes_meta if data_meta is present
    IF lote_record.data_meta IS NOT NULL THEN
      dias_para_meta := (lote_record.data_meta - lote_record.data_pesagem)::INTEGER;
      dias_restantes := dias_para_meta - days_diff;
    ELSE
      dias_restantes := NULL;
    END IF;
    
    -- STEP 4: Update all in same transaction
    UPDATE lotes
    SET periodo = days_diff,
        peso_vivo_kg = new_peso_vivo,
        dias_restantes_meta = dias_restantes
    WHERE id = lote_record.id;
  END LOOP;
END;
$function$;
;
