CREATE OR REPLACE FUNCTION calculate_quant_atual(p_lote_id UUID, p_categoria TEXT)
RETURNS INTEGER AS $$
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

  -- Sum saidas (consumo, abate, saída) from registros_movimentacao - EXCLUDE transfers
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_saidas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND motivo_movimentacao IN ('Consumo', 'Abate', 'Saída')
    AND tipo_saida IS NULL
    AND deleted_at IS NULL;

  -- Sum transferências saida (source) - includes Apartação and Transferência - case-insensitive
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_saida
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND tipo_saida IN ('Transferência', 'Apartação')
    AND deleted_at IS NULL;

  -- Sum transferências entrada (destination) - add to this lot's category regardless of movement's categoria
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_entrada
  FROM registros_movimentacao
  WHERE lote_destino_id = p_lote_id
    AND (tipo_entrada IN ('Transferência', 'Apartação') OR (tipo_entrada IS NULL AND lote_destino_id IS NOT NULL))
    AND deleted_at IS NULL;

  -- Count maternidade (all count as bezerro)
  SELECT COUNT(*) INTO v_maternidade_count
  FROM registros_maternidade
  WHERE lote_id = p_lote_id
    AND deleted_at IS NULL;

  -- Count morte (case-insensitive)
  SELECT COUNT(*) INTO v_morte_count
  FROM registros_morte
  WHERE lote_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND deleted_at IS NULL;

  -- Calculate final quant_atual
  v_quant_atual := v_quant_inicial + v_sum_entradas - v_sum_saidas - v_sum_transf_saida + v_sum_transf_entrada + v_maternidade_count - v_morte_count;

  -- Ensure non-negative
  IF v_quant_atual < 0 THEN
    v_quant_atual := 0;
  END IF;

  RETURN v_quant_atual;
END;
$$ LANGUAGE plpgsql;;
