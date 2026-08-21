
-- Update the classification trigger to also maintain numero_partos
CREATE OR REPLACE FUNCTION update_classificacao_matriz(p_individuo_id UUID)
RETURNS VOID AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count existing maternity records for this mother
  SELECT COUNT(*) INTO v_count
  FROM public.registros_maternidade
  WHERE individuo_id_mae = p_individuo_id
    AND deleted_at IS NULL;

  UPDATE public.individuos
  SET classificacao_matriz = compute_classificacao_matriz(p_individuo_id),
      numero_partos = v_count
  WHERE id = p_individuo_id
    AND sexo = 'Fêmea'
    AND categoria IN ('Vaca Parida', 'Vaca Prenha', 'Vaca Vazia', 'Vaca Descarte', 'Primípara')
    AND origem IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Update ensure_mother_from_maternidade to set numero_partos for new mothers
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
        categoria, classificacao_matriz, numero_partos, origem, status
      ) VALUES (
        NEW.fazenda_id,
        NEW.id_manejo_mae,
        NEW.id_brinco_mae,
        NEW.id_chip_mae,
        'Fêmea',
        raca_cria,
        'Vaca Vazia',
        NEW.categoria_mae,
        1,  -- This is her first recorded birth in the system
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
    
    IF NOT is_new_mother THEN
      UPDATE public.individuos
      SET classificacao_matriz = compute_classificacao_matriz(mother_id),
          numero_partos = (
            SELECT COUNT(*) FROM public.registros_maternidade 
            WHERE individuo_id_mae = mother_id AND deleted_at IS NULL
          )
      WHERE id = mother_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
;
