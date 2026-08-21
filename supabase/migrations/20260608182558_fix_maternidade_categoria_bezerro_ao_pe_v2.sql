-- ============================================
-- Fix maternidade trigger to count births by sex in correct category
-- Standardize lote_categorias to lowercase 'bezerro ao pé'/'bezerra ao pé'
-- Keep individuos capitalized to respect check constraint
-- ============================================

-- 1. Update create_individual_from_maternidade: keep capitalized for individuos constraint
CREATE OR REPLACE FUNCTION public.create_individual_from_maternidade()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  pasto_uuid UUID;
  categoria_value TEXT;
BEGIN
  -- Derive categoria from sexo (capitalized to match individuos check constraint)
  IF NEW.sexo = 'Macho' THEN
    categoria_value := 'Bezerro ao Pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    categoria_value := 'Bezerra ao Pé';
  ELSE
    categoria_value := NULL;
  END IF;

  -- Lookup pasto UUID (use pasto_id directly if available, otherwise lookup by name)
  IF NEW.pasto_id IS NOT NULL THEN
    pasto_uuid := NEW.pasto_id;
  ELSE
    SELECT id INTO pasto_uuid FROM pastos WHERE nome = NEW.pasto AND fazenda_id = NEW.fazenda_id LIMIT 1;
  END IF;

  -- Insert into individuos (handle tipo_parto as jsonb)
  INSERT INTO individuos (
    fazenda_id, data_nascimento, data_entrada_fazenda, peso_nascimento_kg,
    id_provisorio_cria, id_brinco, id_chip, lote_atual, pasto_atual, sexo, raca,
    parto, id_brinco_mae, id_chip_mae, categoria, origem, status
  ) VALUES (
    NEW.fazenda_id, NEW.data::DATE, NEW.data::DATE, NEW.peso_cria_kg::NUMERIC,
    NEW.id_provisorio_cria, NEW.id_brinco_cria, NEW.id_chip_cria, NEW.lote_id,
    pasto_uuid, NEW.sexo, NEW.raca,
    CASE WHEN NEW.tipo_parto IS NOT NULL THEN (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(NEW.tipo_parto) AS value) ELSE NULL END,
    NEW.id_brinco_mae, NEW.id_chip_mae, categoria_value, 'Nascimento', 'Vivo'
  );

  RETURN NEW;
END;
$function$;

-- 2. Update calculate_quant_atual: sex-specific maternidade, zero for non-calf categories
CREATE OR REPLACE FUNCTION public.calculate_quant_atual(p_lote_id uuid, p_categoria text)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_quant_inicial INTEGER;
  v_sum_entradas INTEGER;
  v_sum_saidas INTEGER;
  v_sum_transf_saida INTEGER;
  v_sum_transf_entrada INTEGER;
  v_maternidade_count INTEGER;
  v_morte_count INTEGER;
  v_quant_atual INTEGER;
BEGIN
  -- Get quant_inicial from lote_categorias (case-insensitive)
  SELECT COALESCE(quant_inicial, 0) INTO v_quant_inicial
  FROM lote_categorias
  WHERE lote_id = p_lote_id AND LOWER(categoria) = LOWER(p_categoria);

  -- Sum entradas from registros_movimentacao (case-insensitive)
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_entradas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND motivo_movimentacao = 'Entrada'
    AND deleted_at IS NULL;

  -- Sum saidas (consumo, saída, entrevero without destination) - EXCLUDE transfers
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_saidas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (motivo_movimentacao IN ('Consumo', 'Saída') OR (motivo_movimentacao = 'Entrevero' AND lote_destino_id IS NULL))
    AND tipo_saida IS NULL
    AND deleted_at IS NULL;

  -- Sum transferências saida (source)
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_saida
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (tipo_saida IN ('Transferência', 'Apartação') OR (motivo_movimentacao = 'Entrevero' AND lote_destino_id IS NOT NULL))
    AND deleted_at IS NULL;

  -- Sum transferências entrada (destination)
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_entrada
  FROM registros_movimentacao
  WHERE lote_destino_id = p_lote_id
    AND (tipo_entrada IN ('Transferência', 'Apartação') OR motivo_movimentacao = 'Entrevero' OR (tipo_entrada IS NULL AND lote_destino_id IS NOT NULL))
    AND deleted_at IS NULL;

  -- Count maternidade based on category (sex-specific for calf categories, zero for others)
  IF LOWER(p_categoria) = 'bezerro ao pé' THEN
    SELECT COUNT(*) INTO v_maternidade_count
    FROM registros_maternidade
    WHERE lote_id = p_lote_id AND sexo = 'Macho' AND deleted_at IS NULL;
  ELSIF LOWER(p_categoria) = 'bezerra ao pé' THEN
    SELECT COUNT(*) INTO v_maternidade_count
    FROM registros_maternidade
    WHERE lote_id = p_lote_id AND sexo = 'Fêmea' AND deleted_at IS NULL;
  ELSE
    v_maternidade_count := 0;
  END IF;

  -- Count morte (case-insensitive)
  SELECT COUNT(*) INTO v_morte_count
  FROM registros_morte
  WHERE lote_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND deleted_at IS NULL;

  -- Calculate final quant_atual
  v_quant_atual := v_quant_inicial + v_sum_entradas - v_sum_saidas - v_sum_transf_saida + v_sum_transf_entrada + v_maternidade_count - v_morte_count;

  IF v_quant_atual < 0 THEN
    v_quant_atual := 0;
  END IF;

  RETURN v_quant_atual;
END;
$function$;

-- 3. Update trigger_update_quant_atual_maternidade: handle both sexes, create missing category rows
CREATE OR REPLACE FUNCTION public.update_quant_atual_maternidade()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_categoria TEXT;
BEGIN
  IF NEW.lote_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine category based on sexo (lowercase for lote_categorias)
  IF NEW.sexo = 'Macho' THEN
    v_categoria := 'bezerro ao pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    v_categoria := 'bezerra ao pé';
  ELSE
    v_categoria := 'bezerro ao pé';
  END IF;

  -- Create category row if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM lote_categorias
    WHERE lote_id = NEW.lote_id AND LOWER(categoria) = v_categoria
  ) THEN
    INSERT INTO lote_categorias (lote_id, categoria, quant_atual, quant_inicial)
    VALUES (NEW.lote_id, v_categoria, 0, 0);
  END IF;

  -- Update quant_atual for the specific category
  UPDATE lote_categorias
  SET quant_atual = calculate_quant_atual(NEW.lote_id, v_categoria)
  WHERE lote_id = NEW.lote_id AND LOWER(categoria) = v_categoria;

  RETURN NEW;
END;
$function$;

-- 4. Standardize existing lote_categorias: plain 'bezerro'/'Bezerro' → lowercase 'bezerro ao pé'
UPDATE public.lote_categorias
SET categoria = 'bezerro ao pé'
WHERE LOWER(TRIM(categoria)) = 'bezerro';

-- 5. Re-run the trigger logic for all existing maternidade records to recalculate quant_atual
-- This ensures existing birth counts are redistributed into the correct sex-specific categories
DO $$
DECLARE
  r RECORD;
  v_cat TEXT;
BEGIN
  FOR r IN SELECT id, lote_id, sexo FROM public.registros_maternidade WHERE deleted_at IS NULL LOOP
    IF r.sexo = 'Macho' THEN
      v_cat := 'bezerro ao pé';
    ELSIF r.sexo = 'Fêmea' THEN
      v_cat := 'bezerra ao pé';
    ELSE
      v_cat := 'bezerro ao pé';
    END IF;

    IF r.lote_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.lote_categorias WHERE lote_id = r.lote_id AND LOWER(categoria) = v_cat) THEN
        INSERT INTO public.lote_categorias (lote_id, categoria, quant_atual, quant_inicial)
        VALUES (r.lote_id, v_cat, 0, 0);
      END IF;

      UPDATE public.lote_categorias
      SET quant_atual = public.calculate_quant_atual(r.lote_id, v_cat)
      WHERE lote_id = r.lote_id AND LOWER(categoria) = v_cat;
    END IF;
  END LOOP;
END $$;;
