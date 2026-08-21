
-- Fix: Set classificacao_matriz for on-the-spot mothers from user's manual selection
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
        categoria, classificacao_matriz, origem, status
      ) VALUES (
        NEW.fazenda_id,
        NEW.id_manejo_mae,
        NEW.id_brinco_mae,
        NEW.id_chip_mae,
        'Fêmea',
        raca_cria,
        'Vaca Vazia',
        NEW.categoria_mae,  -- User's manual selection from the form
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
    
    -- For existing mothers, recompute; for new mothers, already set above
    IF NOT is_new_mother THEN
      UPDATE public.individuos
      SET classificacao_matriz = compute_classificacao_matriz(mother_id)
      WHERE id = mother_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Retroactively fix the last created mother
UPDATE public.individuos
SET classificacao_matriz = rm.categoria_mae
FROM public.registros_maternidade rm
WHERE public.individuos.id = rm.individuo_id_mae
  AND public.individuos.origem IS NULL
  AND public.individuos.classificacao_matriz IS NULL
  AND rm.categoria_mae IS NOT NULL;
;
