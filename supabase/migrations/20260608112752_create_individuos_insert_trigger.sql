-- Create INSERT trigger to calculate computed fields
CREATE OR REPLACE FUNCTION calculate_individuos_computed_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate age fields
  IF NEW.data_nascimento IS NOT NULL THEN
    NEW.idade_atual_dias := CURRENT_DATE - NEW.data_nascimento;
    NEW.idade_atual_meses := EXTRACT(YEAR FROM age(CURRENT_DATE, NEW.data_nascimento)) * 12 + 
                             EXTRACT(MONTH FROM age(CURRENT_DATE, NEW.data_nascimento));
  END IF;
  
  -- Calculate period in fazenda
  IF NEW.data_entrada_fazenda IS NOT NULL THEN
    NEW.periodo_fazenda_dias := CURRENT_DATE - NEW.data_entrada_fazenda;
  END IF;
  
  -- Calculate desmama period
  IF NEW.data_desmama IS NOT NULL AND NEW.data_nascimento IS NOT NULL THEN
    NEW.periodo_desmama_dias := NEW.data_desmama - NEW.data_nascimento;
    NEW.periodo_desmama_meses := EXTRACT(YEAR FROM age(NEW.data_desmama, NEW.data_nascimento)) * 12 + 
                                  EXTRACT(MONTH FROM age(NEW.data_desmama, NEW.data_nascimento));
  END IF;
  
  -- Calculate remaining period for SISBOV liberation
  IF NEW.data_liberacao_sisbov IS NOT NULL THEN
    NEW.periodo_restante_liberacao := NEW.data_liberacao_sisbov - CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trg_individuos_insert_computed_fields
BEFORE INSERT ON individuos
FOR EACH ROW
EXECUTE FUNCTION calculate_individuos_computed_fields();;
