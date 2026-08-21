
CREATE OR REPLACE FUNCTION create_individual_from_maternidade()
RETURNS TRIGGER AS $$
DECLARE
  pasto_uuid UUID;
  categoria_value TEXT;
  raca_normalizada TEXT;
  parto_array TEXT[];
BEGIN
  -- Skip if individuo_id_cria is already set (frontend already created it)
  IF NEW.individuo_id_cria IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Derive categoria from sexo
  IF NEW.sexo = 'Macho' THEN
    categoria_value := 'Bezerro ao Pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    categoria_value := 'Bezerra ao Pé';
  ELSE
    categoria_value := NULL;
  END IF;

  -- Normalize raca
  raca_normalizada := CASE UPPER(TRIM(COALESCE(NEW.raca, '')))
    WHEN 'ABERDEEN' THEN 'Aberdeen Angus'
    WHEN 'ABERDEEN ANGUS' THEN 'Aberdeen Angus'
    WHEN 'ANELORADO' THEN 'Anelorado'
    WHEN 'ANGUS' THEN 'Angus'
    WHEN 'BLONDE' THEN 'Blonde'
    WHEN 'BLONDE D''AQUITANE' THEN 'Blonde'
    WHEN 'BRANGUS' THEN 'Brangus'
    WHEN 'CARACU' THEN 'Caracu'
    WHEN 'CHAROLÊS' THEN 'Charolês'
    WHEN 'CHAROLEIS' THEN 'Charolês'
    WHEN 'GIR' THEN 'Gir'
    WHEN 'GIROLANDO' THEN 'Girolando'
    WHEN 'GUZERÁ' THEN 'Guzerá'
    WHEN 'LEITEIRO' THEN 'Leiteiro'
    WHEN 'LIMOUSIN' THEN 'Limousin'
    WHEN 'NELORE' THEN 'Nelore'
    WHEN 'RED ANGUS' THEN 'Red Angus'
    WHEN 'SENEPOL' THEN 'Senepol'
    WHEN 'SIMENTAL' THEN 'Simental'
    WHEN 'SRD' THEN 'SRD'
    WHEN 'TABAPUÃ' THEN 'Tabapuã'
    WHEN 'WAGYU' THEN 'Wagyu'
    WHEN 'WAGIU' THEN 'Wagyu'
    WHEN 'P.O' THEN 'SRD'
    WHEN 'PO' THEN 'SRD'
    ELSE NULL
  END;

  -- Lookup pasto UUID
  IF NEW.pasto_id IS NOT NULL THEN
    pasto_uuid := NEW.pasto_id;
  ELSE
    SELECT id INTO pasto_uuid FROM pastos WHERE nome = NEW.pasto AND fazenda_id = NEW.fazenda_id LIMIT 1;
  END IF;

  -- Convert tipo_parto (jsonb) to text[] for individuos.parto
  IF NEW.tipo_parto IS NOT NULL AND jsonb_array_length(NEW.tipo_parto) > 0 THEN
    SELECT ARRAY(SELECT value::text FROM jsonb_array_elements_text(NEW.tipo_parto) AS value) INTO parto_array;
  ELSE
    parto_array := NULL;
  END IF;

  -- Insert into individuos
  INSERT INTO individuos (
    fazenda_id, data_nascimento, data_entrada_fazenda, peso_nascimento_kg,
    id_provisorio_cria, id_brinco, id_chip, lote_atual, pasto_atual, sexo, raca,
    parto, id_brinco_mae, id_chip_mae, categoria, origem, status
  ) VALUES (
    NEW.fazenda_id, NEW.data::DATE, NEW.data::DATE, NEW.peso_cria_kg::NUMERIC,
    NEW.id_provisorio_cria, NEW.id_brinco_cria, NEW.id_chip_cria, NEW.lote_id,
    pasto_uuid, NEW.sexo, raca_normalizada,
    parto_array,
    NEW.id_brinco_mae, NEW.id_chip_mae, categoria_value, 'Nascimento', 'Vivo'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
;
