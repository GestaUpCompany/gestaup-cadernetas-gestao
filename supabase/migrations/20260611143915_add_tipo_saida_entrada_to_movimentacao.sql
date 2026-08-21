
ALTER TABLE public.registros_movimentacao 
  ADD COLUMN tipo_saida TEXT NULL,
  ADD COLUMN tipo_entrada TEXT NULL;

-- Update lote_categorias trigger to handle maternidade insert properly
CREATE OR REPLACE FUNCTION update_quant_atual_maternidade()
RETURNS TRIGGER AS $$
DECLARE
  v_categoria TEXT;
BEGIN
  IF NEW.lote_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine category based on sexo (lowercase for lote_categorias)
  IF NEW.sexo = 'Macho' THEN
    v_categoria := 'bezerro ao pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    v_categoria := 'bezerra ao pé';
  ELSE
    v_categoria := 'bezerro ao pé';
  END IF;

  -- Create category row if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM lote_categorias
    WHERE lote_id = NEW.lote_id AND LOWER(categoria) = v_categoria
  ) THEN
    INSERT INTO lote_categorias (lote_id, categoria, quant_atual, quant_inicial)
    VALUES (NEW.lote_id, v_categoria, 0, 0);
  END IF;

  -- Update quant_atual for the specific category
  UPDATE lote_categorias
  SET quant_atual = calculate_quant_atual(NEW.lote_id, v_categoria)
  WHERE lote_id = NEW.lote_id AND LOWER(categoria) = v_categoria;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
;
