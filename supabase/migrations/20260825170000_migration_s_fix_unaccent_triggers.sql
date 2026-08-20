-- Migration S: Fix unaccent em sync_gmd_lote_categorias, repropagar_gmd_para_lotes,
-- fn_set_gmd_bezerro_ao_pe, calculate_quant_atual, update_quant_atual_maternidade
-- Todas as funcoes que filtram/identificam bezerros ao pe agora usam LOWER(unaccent())

CREATE OR REPLACE FUNCTION public.sync_gmd_lote_categorias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
BEGIN
  IF NEW.formulacao_id IS DISTINCT FROM OLD.formulacao_id OR TG_OP = 'INSERT' THEN
    -- Limpa GMD de categorias que nao estao na nova formulacao
    -- (exceto bezerros ao pe, que tem GMD proprio)
    UPDATE public.lote_categorias lc
      SET gmd = NULL
      WHERE lc.lote_id = NEW.id
        AND lc.ativo = true
        AND lc.data_fim IS NULL
        AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerro ao pe'
        AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerra ao pe'
        AND NOT EXISTS (
          SELECT 1 FROM public.formulacao_categorias_gmd fcg
          WHERE fcg.formulacao_id = NEW.formulacao_id
            AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(lc.categoria))
        );

    -- Seta GMD das categorias que estao na formulacao
    UPDATE public.lote_categorias lc
      SET gmd = fcg.gmd::text
      FROM public.formulacao_categorias_gmd fcg
      WHERE lc.lote_id = NEW.id
        AND lc.ativo = true
        AND lc.data_fim IS NULL
        AND fcg.formulacao_id = NEW.formulacao_id
        AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria));
  END IF;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.repropagar_gmd_para_lotes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_form_id uuid;
BEGIN
  v_form_id := COALESCE(NEW.formulacao_id, OLD.formulacao_id);

  IF v_form_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.lote_categorias lc
    SET gmd = fcg.gmd::text
    FROM public.formulacao_categorias_gmd fcg
    WHERE lc.ativo = true
      AND lc.data_fim IS NULL
      AND fcg.formulacao_id = v_form_id
      AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria))
      AND EXISTS (
        SELECT 1 FROM public.lotes l
        WHERE l.id = lc.lote_id
          AND l.formulacao_id = v_form_id
      );

  IF TG_OP = 'DELETE' THEN
    UPDATE public.lote_categorias lc
      SET gmd = NULL
      WHERE lc.ativo = true
        AND lc.data_fim IS NULL
        AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(OLD.categoria))
        AND EXISTS (
          SELECT 1 FROM public.lotes l
          WHERE l.id = lc.lote_id
            AND l.formulacao_id = v_form_id
        )
        AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerro ao pe'
        AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerra ao pe';
  END IF;

  RETURN NULL;
END;
$func$;

CREATE OR REPLACE FUNCTION public.fn_set_gmd_bezerro_ao_pe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF LOWER(unaccent(NEW.categoria)) ILIKE 'bezerro ao pe' THEN
      NEW.gmd := '0.600';
    ELSIF LOWER(unaccent(NEW.categoria)) ILIKE 'bezerra ao pe' THEN
      NEW.gmd := '0.500';
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION public.calculate_quant_atual(p_lote_id uuid, p_categoria text)
RETURNS integer
LANGUAGE plpgsql
AS $func$
DECLARE
  v_quant_inicial_raw INTEGER;
  v_quant_inicial INTEGER;
  v_created_at timestamptz;
  v_date_cutoff timestamptz;
  v_sum_entradas INTEGER;
  v_sum_saidas INTEGER;
  v_sum_transf_saida INTEGER;
  v_sum_transf_entrada INTEGER;
  v_maternidade_count INTEGER;
  v_morte_count INTEGER;
  v_quant_atual INTEGER;
BEGIN
  SELECT quant_inicial, created_at
  INTO v_quant_inicial_raw, v_created_at
  FROM lote_categorias
  WHERE lote_id = p_lote_id AND LOWER(categoria) = LOWER(p_categoria)
    AND ativo = true
  LIMIT 1;

  IF v_created_at IS NULL THEN
    RETURN 0;
  END IF;

  v_quant_inicial := COALESCE(v_quant_inicial_raw, 0);

  IF v_quant_inicial_raw IS NULL THEN
    v_date_cutoff := '1900-01-01'::timestamptz;
  ELSE
    v_date_cutoff := v_created_at;
  END IF;

  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_entradas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND motivo_movimentacao = 'Entrada'
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_saidas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (motivo_movimentacao IN ('Consumo', 'Saída') OR (motivo_movimentacao = 'Entrevero' AND lote_destino_id IS NULL))
    AND tipo_saida IS NULL
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_saida
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (tipo_saida IN ('Transferência', 'Apartação') OR (motivo_movimentacao = 'Entrevero' AND lote_destino_id IS NOT NULL))
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_entrada
  FROM registros_movimentacao
  WHERE lote_destino_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (tipo_entrada IN ('Transferência', 'Apartação') OR motivo_movimentacao = 'Entrevero' OR (tipo_entrada IS NULL AND lote_destino_id IS NOT NULL))
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  IF LOWER(unaccent(p_categoria)) ILIKE 'bezerro ao pe' THEN
    SELECT COUNT(*) INTO v_maternidade_count
    FROM registros_maternidade
    WHERE lote_id = p_lote_id AND sexo = 'Macho' AND data >= v_date_cutoff AND deleted_at IS NULL;
  ELSIF LOWER(unaccent(p_categoria)) ILIKE 'bezerra ao pe' THEN
    SELECT COUNT(*) INTO v_maternidade_count
    FROM registros_maternidade
    WHERE lote_id = p_lote_id AND sexo = 'Fêmea' AND data >= v_date_cutoff AND deleted_at IS NULL;
  ELSE
    v_maternidade_count := 0;
  END IF;

  SELECT COUNT(*) INTO v_morte_count
  FROM registros_morte
  WHERE lote_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  v_quant_atual := v_quant_inicial + v_sum_entradas - v_sum_saidas - v_sum_transf_saida + v_sum_transf_entrada + v_maternidade_count - v_morte_count;

  IF v_quant_atual < 0 THEN
    v_quant_atual := 0;
  END IF;

  RETURN v_quant_atual;
END;
$func$;

CREATE OR REPLACE FUNCTION public.update_quant_atual_maternidade()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  v_categoria TEXT;
BEGIN
  IF NEW.lote_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.sexo = 'Macho' THEN
    v_categoria := 'bezerro ao pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    v_categoria := 'bezerra ao pé';
  ELSE
    v_categoria := 'bezerro ao pé';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM lote_categorias
    WHERE lote_id = NEW.lote_id AND LOWER(unaccent(categoria)) = LOWER(unaccent(v_categoria))
  ) THEN
    INSERT INTO lote_categorias (lote_id, categoria, quant_atual, quant_inicial)
    VALUES (NEW.lote_id, v_categoria, 0, 0);
  END IF;

  UPDATE lote_categorias
  SET quant_atual = calculate_quant_atual(NEW.lote_id, v_categoria)
  WHERE lote_id = NEW.lote_id AND LOWER(unaccent(categoria)) = LOWER(unaccent(v_categoria));

  RETURN NEW;
END;
$func$;
