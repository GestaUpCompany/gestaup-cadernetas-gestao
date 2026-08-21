-- Create function to cache estrategia_nutricional_nome
CREATE OR REPLACE FUNCTION cache_estrategia_nutricional_nome()
RETURNS TRIGGER AS $$
DECLARE
  strategy_nome TEXT;
BEGIN
  -- Clear cached name if ID is null
  IF NEW.estrategia_nutricional_id IS NULL THEN
    NEW.estrategia_nutricional_nome := NULL;
    RETURN NEW;
  END IF;
  
  -- Fetch name from corresponding table based on tipo
  CASE NEW.estrategia_nutricional_tipo
    WHEN 'insumo' THEN
      SELECT nome INTO strategy_nome FROM insumos WHERE id = NEW.estrategia_nutricional_id;
    WHEN 'mineral' THEN
      SELECT nome INTO strategy_nome FROM mineral WHERE id = NEW.estrategia_nutricional_id;
    WHEN 'proteinado' THEN
      SELECT nome INTO strategy_nome FROM proteinado WHERE id = NEW.estrategia_nutricional_id;
    WHEN 'racao' THEN
      SELECT nome INTO strategy_nome FROM racao WHERE id = NEW.estrategia_nutricional_id;
    ELSE
      -- Invalid tipo, clear cached name
      NEW.estrategia_nutricional_nome := NULL;
      RETURN NEW;
  END CASE;
  
  -- Update cached name
  NEW.estrategia_nutricional_nome := strategy_nome;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on individuos
CREATE TRIGGER trg_individuos_cache_estrategia_nutricional_nome
BEFORE INSERT OR UPDATE OF estrategia_nutricional_tipo, estrategia_nutricional_id ON individuos
FOR EACH ROW
EXECUTE FUNCTION cache_estrategia_nutricional_nome();;
