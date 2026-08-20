CREATE OR REPLACE FUNCTION update_quant_atual_morte()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process for specific fazenda
  IF NEW.fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3' THEN
    -- Update quant_atual for the lote and category
    UPDATE lote_categorias
    SET quant_atual = calculate_quant_atual(NEW.lote_id, NEW.categoria)
    WHERE lote_id = NEW.lote_id AND categoria = NEW.categoria;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quant_atual_morte
AFTER INSERT ON registros_morte
FOR EACH ROW
EXECUTE FUNCTION update_quant_atual_morte();;
