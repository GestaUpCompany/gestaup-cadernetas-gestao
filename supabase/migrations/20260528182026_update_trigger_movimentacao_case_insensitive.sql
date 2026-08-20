CREATE OR REPLACE FUNCTION update_quant_atual_movimentacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process for specific fazenda
  IF NEW.fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3' THEN
    -- Update quant_atual for source lot (lote_origem_id) - case-insensitive
    IF NEW.lote_origem_id IS NOT NULL AND NEW.categoria IS NOT NULL THEN
      UPDATE lote_categorias
      SET quant_atual = calculate_quant_atual(NEW.lote_origem_id, NEW.categoria)
      WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria);
    END IF;

    -- Update quant_atual for destination lot (lote_destino_id) if it's a transfer - case-insensitive
    IF NEW.lote_destino_id IS NOT NULL AND NEW.categoria IS NOT NULL THEN
      UPDATE lote_categorias
      SET quant_atual = calculate_quant_atual(NEW.lote_destino_id, NEW.categoria)
      WHERE lote_id = NEW.lote_destino_id AND LOWER(categoria) = LOWER(NEW.categoria);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;;
