CREATE OR REPLACE FUNCTION update_quant_atual_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
  v_source_cat RECORD;
BEGIN
  -- Only process for specific fazenda
  IF NEW.fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3' THEN
    -- Update quant_atual for source lot (lote_origem_id) - case-insensitive
    IF NEW.lote_origem_id IS NOT NULL AND NEW.categoria IS NOT NULL THEN
      UPDATE lote_categorias
      SET quant_atual = calculate_quant_atual(NEW.lote_origem_id, NEW.categoria)
      WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria);
    END IF;

    -- Update quant_atual for destination lot (lote_destino_id)
    IF NEW.lote_destino_id IS NOT NULL AND NEW.categoria IS NOT NULL THEN
      -- Check if category exists in destination lot
      IF NOT EXISTS (
        SELECT 1 FROM lote_categorias 
        WHERE lote_id = NEW.lote_destino_id AND LOWER(categoria) = LOWER(NEW.categoria)
      ) THEN
        -- Fetch source category data
        SELECT * INTO v_source_cat
        FROM lote_categorias
        WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria);
        
        -- Create new category with copied data and quant_atual = numero_cabecas
        INSERT INTO lote_categorias (
          lote_id, categoria, quant_inicial, quant_atual,
          data_pesagem, peso_entrada, peso_entrada_arrobas, gmd, periodo,
          rc_inicial, peso_vivo_kg, peso_vivo_meta_kg, dias_restantes_meta,
          data_meta, estrategia_nutricional, raca, sexo, idade,
          preco_animal_kg, preco_animal_cab, custo_operacional, ativo
        ) VALUES (
          NEW.lote_destino_id, NEW.categoria, NEW.numero_cabecas, NEW.numero_cabecas,
          v_source_cat.data_pesagem, v_source_cat.peso_entrada, v_source_cat.peso_entrada_arrobas,
          v_source_cat.gmd, v_source_cat.periodo, v_source_cat.rc_inicial,
          v_source_cat.peso_vivo_kg, v_source_cat.peso_vivo_meta_kg, v_source_cat.dias_restantes_meta,
          v_source_cat.data_meta, v_source_cat.estrategia_nutricional, v_source_cat.raca,
          v_source_cat.sexo, v_source_cat.idade, v_source_cat.preco_animal_kg,
          v_source_cat.preco_animal_cab, v_source_cat.custo_operacional, true
        );
      ELSE
        -- Update quant_atual for all categories in destination lot
        UPDATE lote_categorias
        SET quant_atual = calculate_quant_atual(lote_id, categoria)
        WHERE lote_id = NEW.lote_destino_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;;
