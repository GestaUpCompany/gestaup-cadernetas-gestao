
-- Fix: Don't auto-compute classificacao_matriz for newly created mothers
-- They may have prior real-world births not in the system yet
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
        NULL,
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
    
    -- Only auto-compute classificacao_matriz for EXISTING mothers
    -- New on-the-spot mothers get NULL — user manually sets category
    IF NOT is_new_mother THEN
      UPDATE public.individuos
      SET classificacao_matriz = compute_classificacao_matriz(mother_id)
      WHERE id = mother_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also reset classificacao_matriz to NULL for all trigger-created mothers
-- (those with NULL origem = created on-the-spot)
UPDATE public.individuos
SET classificacao_matriz = NULL
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND sexo = 'Fêmea'
  AND origem IS NULL;
;
