-- Fix: transf_entrada não filtrava por categoria, somando transferências de
-- categorias diferentes (Touro, Vaca, Bezerro) ao quant_atual da categoria
-- calculada (boi magro, garrote, Novilha, etc).
--
-- Problema:
--   A query de v_sum_transf_entrada filtrava apenas por lote_destino_id,
--   sem filtrar por categoria. Se um lote com categoria "boi magro" recebia
--   uma apartação de 61 Touros, a função somava 61 ao quant_atual de "boi magro",
--   mesmo que nenhum Touro pertença a essa categoria.
--
--   Casos confirmados:
--   - L1/boi magro: +99 (Bezerro, Vaca, Touro) somados incorretamente
--   - L3/garrote: +62 (Touro) somados incorretamente
--   - L5/Novilha: +27 (bezerra ao pé, bezerro ao pé, vaca) somados incorretamente
--
-- Fix:
--   Adicionar LOWER(categoria) = LOWER(p_categoria) na query de v_sum_transf_entrada,
--   igualando às demais queries (v_sum_entradas, v_sum_saidas, v_sum_transf_saida)
--   que já filtram por categoria.
--
-- Reverte migration anterior (20260813150000):
--   O filtro de data >= created_at foi removido. Ele era incorreto porque
--   a trigger update_quant_atual_movimentacao cria a categoria com
--   quant_inicial = numero_cabecas da apartação e created_at anterior à
--   movimentação. O bug de DELETE+recreate do handleSubmit (corrigido em
--   1bd3a8c) era o que resetava o created_at, não a função. Com o bug de
--   edição corrigido, o filtro de data é desnecessário e quebra lotes onde
--   o usuário preencheu quant_inicial diferente do montante da apartação.

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
  -- Get quant_inicial from lote_categorias (apenas ativas, case-insensitive)
  SELECT COALESCE(quant_inicial, 0)
  INTO v_quant_inicial
  FROM lote_categorias
  WHERE lote_id = p_lote_id AND LOWER(categoria) = LOWER(p_categoria)
    AND ativo = true
  LIMIT 1;

  -- Se não encontrou categoria ativa, retorna 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

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

  -- Sum transferências entrada (destination) - filtra por categoria (Bug #1 fix)
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_entrada
  FROM registros_movimentacao
  WHERE lote_destino_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
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

COMMENT ON FUNCTION public.calculate_quant_atual(uuid, text) IS
  'Calcula quant_atual de uma categoria ativa de um lote. Soma quant_inicial + entradas - saídas - transf_saída + transf_entrada + maternidade - mortes. Todas as queries de movimentação filtram por categoria (case-insensitive), incluindo transf_entrada que antes não filtrava e somava categorias erradas.';
