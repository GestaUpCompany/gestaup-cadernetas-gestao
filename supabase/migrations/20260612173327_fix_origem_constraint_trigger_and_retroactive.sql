
-- Fix the trigger to use NULL origem (column is nullable, check only applies to non-NULL)
CREATE OR REPLACE FUNCTION ensure_mother_from_maternidade()
RETURNS TRIGGER AS $$
DECLARE
  mother_id UUID;
  is_new_mother BOOLEAN := false;
  raca_cria TEXT;
BEGIN
  IF NEW.individuo_id_mae IS NULL AND (
    NEW.id_brinco_mae IS NOT NULL OR 
    NEW.id_chip_mae IS NOT NULL OR 
    NEW.id_manejo_mae IS NOT NULL
  ) THEN
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
    
    IF mother_id IS NULL THEN
      is_new_mother := true;
      raca_cria := NEW.raca;
      IF raca_cria IS NULL OR raca_cria = '' THEN
        raca_cria := 'SRD';
      END IF;
      
      INSERT INTO public.individuos (
        fazenda_id, id_manejo, id_brinco, id_chip, sexo, raca,
        categoria, origem, status
      ) VALUES (
        NEW.fazenda_id,
        NEW.id_manejo_mae,
        NEW.id_brinco_mae,
        NEW.id_chip_mae,
        'Fêmea',
        raca_cria,
        'Vaca Vazia',
        NULL,  -- origem is nullable, no valid value for on-spot creation
        'Vivo'
      )
      RETURNING id INTO mother_id;
    END IF;
    
    UPDATE public.registros_maternidade
    SET individuo_id_mae = mother_id
    WHERE id = NEW.id;
    
    IF NEW.individuo_id_cria IS NOT NULL THEN
      UPDATE public.individuos
      SET mae = mother_id,
          id_brinco_mae = NULL,
          id_chip_mae = NULL
      WHERE id = NEW.individuo_id_cria
        AND mae IS NULL;
    END IF;
    
    UPDATE public.individuos
    SET classificacao_matriz = compute_classificacao_matriz(mother_id)
    WHERE id = mother_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now retroactively fix all existing records
DO $$
DECLARE
  rec RECORD;
  mother_id UUID;
  calf_raca TEXT;
BEGIN
  FOR rec IN 
    SELECT id, fazenda_id, id_brinco_mae, id_chip_mae, id_manejo_mae, 
           individuo_id_cria, raca AS maternidade_raca
    FROM public.registros_maternidade
    WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
      AND individuo_id_mae IS NULL
      AND (id_brinco_mae IS NOT NULL OR id_chip_mae IS NOT NULL OR id_manejo_mae IS NOT NULL)
  LOOP
    SELECT id INTO mother_id
    FROM public.individuos
    WHERE fazenda_id = rec.fazenda_id
      AND sexo = 'Fêmea'
      AND (
        (rec.id_brinco_mae IS NOT NULL AND id_brinco = rec.id_brinco_mae) OR
        (rec.id_chip_mae IS NOT NULL AND id_chip = rec.id_chip_mae) OR
        (rec.id_manejo_mae IS NOT NULL AND id_manejo = rec.id_manejo_mae)
      )
    LIMIT 1;
    
    IF mother_id IS NULL THEN
      calf_raca := rec.maternidade_raca;
      IF calf_raca IS NULL OR calf_raca = '' THEN
        calf_raca := 'SRD';
      END IF;
      
      INSERT INTO public.individuos (
        fazenda_id, id_manejo, id_brinco, id_chip, sexo, raca,
        categoria, origem, status
      ) VALUES (
        rec.fazenda_id, rec.id_manejo_mae, rec.id_brinco_mae, rec.id_chip_mae,
        'Fêmea', calf_raca, 'Vaca Vazia', NULL, 'Vivo'
      )
      RETURNING id INTO mother_id;
    END IF;
    
    UPDATE public.registros_maternidade
    SET individuo_id_mae = mother_id
    WHERE id = rec.id;
    
    IF rec.individuo_id_cria IS NOT NULL THEN
      UPDATE public.individuos
      SET mae = mother_id,
          id_brinco_mae = NULL,
          id_chip_mae = NULL
      WHERE id = rec.individuo_id_cria
        AND mae IS NULL;
    END IF;
  END LOOP;
  
  -- Recompute classificacao_matriz for all mothers
  UPDATE public.individuos
  SET classificacao_matriz = compute_classificacao_matriz(id)
  WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
    AND sexo = 'Fêmea'
    AND id IN (SELECT DISTINCT individuo_id_mae FROM public.registros_maternidade WHERE individuo_id_mae IS NOT NULL);
END $$;
;
