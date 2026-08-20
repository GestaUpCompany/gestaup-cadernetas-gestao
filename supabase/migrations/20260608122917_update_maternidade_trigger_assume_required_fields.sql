-- Update trigger to assume lote_id and pasto are always present
CREATE OR REPLACE FUNCTION create_individual_from_maternidade()
RETURNS TRIGGER AS $$
DECLARE
  pasto_uuid UUID;
  categoria_value TEXT;
BEGIN
  -- Derive categoria from sexo
  IF NEW.sexo = 'Macho' THEN
    categoria_value := 'Bezerro ao Pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    categoria_value := 'Bezerra ao Pé';
  ELSE
    categoria_value := NULL;
  END IF;
  
  -- Lookup pasto UUID (pasto is now always present)
  SELECT id INTO pasto_uuid FROM pastos WHERE nome = NEW.pasto AND fazenda_id = NEW.fazenda_id LIMIT 1;
  
  -- Insert into individuos (lote_id and pasto are now always present)
  INSERT INTO individuos (
    fazenda_id,
    data_nascimento,
    data_entrada_fazenda,
    peso_nascimento_kg,
    id_provisorio_cria,
    id_brinco,
    id_chip,
    lote_atual,
    pasto_atual,
    sexo,
    raca,
    parto,
    id_brinco_mae,
    id_chip_mae,
    categoria,
    origem,
    status
  ) VALUES (
    NEW.fazenda_id,
    NEW.data::DATE,
    NEW.data::DATE,
    NEW.peso_cria_kg::NUMERIC,
    NEW.id_provisorio_cria,
    NEW.id_brinco_cria,
    NEW.id_chip_cria,
    NEW.lote_id,
    pasto_uuid,
    NEW.sexo,
    NEW.raca,
    CASE WHEN NEW.tipo_parto IS NOT NULL THEN array_to_string(NEW.tipo_parto, ', ') ELSE NULL END,
    NEW.id_brinco_mae,
    NEW.id_chip_mae,
    categoria_value,
    'Nascimento',
    'Vivo'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;;
