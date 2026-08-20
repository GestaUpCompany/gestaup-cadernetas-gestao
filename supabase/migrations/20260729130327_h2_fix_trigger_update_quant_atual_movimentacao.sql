-- Corrigir trigger quebrado: update_quant_atual_movimentacao
-- As colunas peso_entrada, peso_vivo_kg, peso_vivo_meta_kg, data_meta, 
-- preco_animal_kg, preco_animal_cab, custo_operacional foram renomeadas/removidas
-- na migration da cronologia evolutiva.

CREATE OR REPLACE FUNCTION public.update_quant_atual_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_source_cat RECORD;
BEGIN
  -- Update quant_atual for source lot (lote_origem_id) - case-insensitive
  IF NEW.lote_origem_id IS NOT NULL AND NEW.categoria IS NOT NULL THEN
    UPDATE lote_categorias
    SET quant_atual = calculate_quant_atual(NEW.lote_origem_id, NEW.categoria)
    WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;
  END IF;

  -- Update quant_atual for destination lot (lote_destino_id)
  IF NEW.lote_destino_id IS NOT NULL AND NEW.categoria IS NOT NULL THEN
    -- Check if category exists in destination lot (ativa)
    IF NOT EXISTS (
      SELECT 1 FROM lote_categorias 
      WHERE lote_id = NEW.lote_destino_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true
    ) THEN
      -- Fetch source category data
      SELECT * INTO v_source_cat
      FROM lote_categorias
      WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;
      
      -- Create new category with copied data and quant_atual = numero_cabecas
      -- Colunas alinhadas com schema atual (peso_entrada_kg_cab, peso_vivo_atual_kg_cab, etc.)
      INSERT INTO lote_categorias (
        lote_id, categoria, quant_inicial, quant_atual,
        data_pesagem, peso_entrada_kg_cab, peso_entrada_arrobas, gmd, periodo,
        rc_inicial, peso_vivo_atual_kg_cab, peso_vivo_meta_kg_cab, dias_restantes_meta,
        estrategia_nutricional, raca, sexo, idade, ativo
      ) VALUES (
        NEW.lote_destino_id, NEW.categoria, NEW.numero_cabecas, NEW.numero_cabecas,
        v_source_cat.data_pesagem, v_source_cat.peso_entrada_kg_cab, v_source_cat.peso_entrada_arrobas,
        v_source_cat.gmd, v_source_cat.periodo, v_source_cat.rc_inicial,
        v_source_cat.peso_vivo_atual_kg_cab, v_source_cat.peso_vivo_meta_kg_cab, v_source_cat.dias_restantes_meta,
        v_source_cat.estrategia_nutricional, v_source_cat.raca,
        v_source_cat.sexo, v_source_cat.idade, true
      );
    ELSE
      -- Update quant_atual for the affected category in destination lot only
      UPDATE lote_categorias
      SET quant_atual = calculate_quant_atual(lote_id, categoria)
      WHERE lote_id = NEW.lote_destino_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

SELECT 'Trigger update_quant_atual_movimentacao corrigido' AS status;;
