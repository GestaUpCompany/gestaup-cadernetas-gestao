-- ============================================
-- Standardize raca between maternidade and individuos
-- Use individuos constraint as source of truth, expand to cover all frontend breeds
-- ============================================

-- 1. Drop old constraint and recreate with comprehensive breed list
ALTER TABLE public.individuos DROP CONSTRAINT IF EXISTS individuos_raca_check;

ALTER TABLE public.individuos ADD CONSTRAINT individuos_raca_check
CHECK (
  raca = ANY (ARRAY[
    'Aberdeen Angus'::text,
    'Anelorado'::text,
    'Angus'::text,
    'Blonde'::text,
    'Brangus'::text,
    'Caracu'::text,
    'Charolês'::text,
    'Gir'::text,
    'Girolando'::text,
    'Guzerá'::text,
    'Leiteiro'::text,
    'Limousin'::text,
    'Nelore'::text,
    'Red Angus'::text,
    'Senepol'::text,
    'Simental'::text,
    'SRD'::text,
    'Tabapuã'::text,
    'Wagyu'::text
  ])
);

-- 2. Update trigger to map all frontend breeds to individuos standard
CREATE OR REPLACE FUNCTION public.create_individual_from_maternidade()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  pasto_uuid UUID;
  categoria_value TEXT;
  raca_normalizada TEXT;
BEGIN
  -- Derive categoria from sexo
  IF NEW.sexo = 'Macho' THEN
    categoria_value := 'Bezerro ao Pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    categoria_value := 'Bezerra ao Pé';
  ELSE
    categoria_value := NULL;
  END IF;

  -- Normalize raca: map frontend values to individuos standard, pass through valid ones
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

  -- Insert into individuos
  INSERT INTO individuos (
    fazenda_id, data_nascimento, data_entrada_fazenda, peso_nascimento_kg,
    id_provisorio_cria, id_brinco, id_chip, lote_atual, pasto_atual, sexo, raca,
    parto, id_brinco_mae, id_chip_mae, categoria, origem, status
  ) VALUES (
    NEW.fazenda_id, NEW.data::DATE, NEW.data::DATE, NEW.peso_cria_kg::NUMERIC,
    NEW.id_provisorio_cria, NEW.id_brinco_cria, NEW.id_chip_cria, NEW.lote_id,
    pasto_uuid, NEW.sexo, raca_normalizada,
    CASE WHEN NEW.tipo_parto IS NOT NULL THEN (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(NEW.tipo_parto) AS value) ELSE NULL END,
    NEW.id_brinco_mae, NEW.id_chip_mae, categoria_value, 'Nascimento', 'Vivo'
  );

  RETURN NEW;
END;
$function$;

-- 3. Normalize existing registros_maternidade data to match individuos standard
UPDATE public.registros_maternidade
SET raca = CASE UPPER(TRIM(COALESCE(raca, '')))
  WHEN 'ABERDEEN' THEN 'Aberdeen Angus'
  WHEN 'WAGIU' THEN 'Wagyu'
  WHEN 'P.O' THEN 'SRD'
  WHEN 'PO' THEN 'SRD'
  ELSE raca
END
WHERE UPPER(TRIM(COALESCE(raca, ''))) IN ('ABERDEEN', 'WAGIU', 'P.O', 'PO')
  AND deleted_at IS NULL;;
