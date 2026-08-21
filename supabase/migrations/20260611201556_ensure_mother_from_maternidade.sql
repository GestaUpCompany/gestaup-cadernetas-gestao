
-- Trigger to auto-create/find mother when maternity record is inserted with text IDs but no individuo_id_mae
CREATE OR REPLACE FUNCTION ensure_mother_from_maternidade()
RETURNS TRIGGER AS $$
DECLARE
  mother_id UUID;
BEGIN
  -- Only run if individuo_id_mae is not set but at least one text ID is present
  IF NEW.individuo_id_mae IS NULL AND (
    NEW.id_brinco_mae IS NOT NULL OR 
    NEW.id_chip_mae IS NOT NULL OR 
    NEW.id_manejo_mae IS NOT NULL
  ) THEN
    -- Try to find existing mother with matching identifiers
    SELECT id INTO mother_id
    FROM public.individuos
    WHERE fazenda_id = NEW.fazenda_id
      AND sexo = 'Fêmea'
      AND (
        (NEW.id_brinco_mae IS NOT NULL AND id_brinco = NEW.id_brinco_mae) OR
        (NEW.id_chip_mae IS NOT NULL AND id_chip = NEW.id_chip_mae) OR
        (NEW.id_manejo_mae IS NOT NULL AND id_manejo = NEW.id_manejo_mae)
      )
    LIMIT 1;
    
    -- If not found, create new mother
    IF mother_id IS NULL THEN
      INSERT INTO public.individuos (
        fazenda_id,
        id_manejo,
        id_brinco,
        id_chip,
        sexo,
        categoria,
        origem,
        status
      ) VALUES (
        NEW.fazenda_id,
        NEW.id_manejo_mae,
        NEW.id_brinco_mae,
        NEW.id_chip_mae,
        'Fêmea',
        'Vaca Vazia',
        'Cadastro Manual',
        'Vivo'
      )
      RETURNING id INTO mother_id;
    END IF;
    
    -- Update maternity record with mother's UUID
    UPDATE public.registros_maternidade
    SET individuo_id_mae = mother_id
    WHERE id = NEW.id;
    
    -- Link calf to mother if calf was already created
    IF NEW.individuo_id_cria IS NOT NULL THEN
      UPDATE public.individuos
      SET mae = mother_id,
          id_brinco_mae = NULL,
          id_chip_mae = NULL
      WHERE id = NEW.individuo_id_cria
        AND mae IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the AFTER INSERT trigger
DROP TRIGGER IF EXISTS trigger_ensure_mother_from_maternidade ON public.registros_maternidade;
CREATE TRIGGER trigger_ensure_mother_from_maternidade
AFTER INSERT ON public.registros_maternidade
FOR EACH ROW
EXECUTE FUNCTION ensure_mother_from_maternidade();
;
