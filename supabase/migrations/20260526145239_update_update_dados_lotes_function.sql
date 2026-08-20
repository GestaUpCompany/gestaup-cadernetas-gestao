-- Update update_dados_lotes function to work with lote_categorias
CREATE OR REPLACE FUNCTION public.update_dados_lotes()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  peso_entrada_arrobas NUMERIC;
  quant_atual INTEGER;
BEGIN
  FOR categoria_record IN 
    SELECT id, peso_entrada, gmd, data_pesagem, data_meta, rc_inicial,
           quant_inicial, morte, consumo, abate, transf_saida, transf_entrada
    FROM lote_categorias
    WHERE peso_entrada IS NOT NULL 
      AND gmd IS NOT NULL 
      AND data_pesagem IS NOT NULL
  LOOP
    -- STEP 1: Calculate periodo
    days_diff := (CURRENT_DATE - categoria_record.data_pesagem)::INTEGER;
    
    -- STEP 2: Calculate peso_vivo_kg
    new_peso_vivo := categoria_record.peso_entrada + (categoria_record.gmd * days_diff);
    
    -- STEP 3: Calculate dias_restantes_meta
    IF categoria_record.data_meta IS NOT NULL THEN
      dias_para_meta := (categoria_record.data_meta - categoria_record.data_pesagem)::INTEGER;
      dias_restantes := dias_para_meta - days_diff;
    ELSE
      dias_restantes := NULL;
    END IF;
    
    -- STEP 4: Calculate peso_entrada_arrobas
    IF categoria_record.rc_inicial IS NOT NULL THEN
      peso_entrada_arrobas := (categoria_record.peso_entrada * categoria_record.rc_inicial) / 15;
    ELSE
      peso_entrada_arrobas := NULL;
    END IF;
    
    -- STEP 5: Calculate quant_atual
    IF categoria_record.quant_inicial IS NOT NULL THEN
      quant_atual := categoria_record.quant_inicial 
                    - COALESCE(categoria_record.morte, 0) 
                    - COALESCE(categoria_record.consumo, 0) 
                    - COALESCE(categoria_record.abate, 0) 
                    - COALESCE(categoria_record.transf_saida, 0) 
                    + COALESCE(categoria_record.transf_entrada, 0);
    ELSE
      quant_atual := NULL;
    END IF;
    
    -- STEP 6: Update all in same transaction
    UPDATE lote_categorias
    SET periodo = days_diff,
        peso_vivo_kg = new_peso_vivo,
        dias_restantes_meta = dias_restantes,
        peso_entrada_arrobas = peso_entrada_arrobas,
        quant_atual = quant_atual
    WHERE id = categoria_record.id;
  END LOOP;
END;
$function$;;
