CREATE OR REPLACE FUNCTION update_quant_atual_maternidade()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process for specific fazenda
  IF NEW.fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3' THEN
    -- Update quant_atual for the lote (all maternidade records count as bezerro)
    UPDATE lote_categorias
    SET quant_atual = calculate_quant_atual(NEW.lote_id, 'bezerro')
    WHERE lote_id = NEW.lote_id AND categoria = 'bezerro';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quant_atual_maternidade
AFTER INSERT ON registros_maternidade
FOR EACH ROW
EXECUTE FUNCTION update_quant_atual_maternidade();;
