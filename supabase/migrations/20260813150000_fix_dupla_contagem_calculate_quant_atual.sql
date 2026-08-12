-- Fix: dupla contagem em calculate_quant_atual quando lote_categorias nasce de apartação/transferência
--
-- Problema:
--   calculate_quant_atual soma quant_inicial + SUM(movimentacoes posteriores).
--   Mas quando uma lote_categorias é criada para receber animais de uma apartação,
--   o quant_inicial já reflete esses animais, e a movimentação de origem (com
--   lote_destino_id = lote_novo) também é somada, contando os mesmos animais 2x.
--   Caso confirmado: LOTE 15P GAR 6A (GBJ Mirandópolis) com 228 -> 456 cabeças.
--
-- Causa raiz:
--   1. Movimentações com data anterior ao created_at da categoria já estão
--      refletidas no quant_inicial e não deveriam ser somadas novamente.
--   2. Cláusula fallback em v_sum_transf_entrada:
--        (tipo_entrada IS NULL AND lote_destino_id IS NOT NULL)
--      captura registros de motivo='Saída' (apartação) como entrada do destino
--      mesmo quando a categoria do destino nasceu dessa movimentação.
--
-- Fix:
--   Capturar o created_at da lote_categorias ativa e filtrar TODAS as queries
--   de registros_movimentacao, registros_morte e registros_maternidade por
--   data >= v_created_at. Movimentações anteriores à criação da categoria
--   já estão embutidas no quant_inicial e não devem ser re-somadas.
--
--   EXCEÇÃO: quando quant_inicial IS NULL, o filtro de data é desativado
--   (v_created_at setado para epoch). Categorias de bezerro/bezerra ao pé
--   frequentemente têm quant_inicial=NULL e a contagem vem das maternidades;
--   filtrar maternidades por data zeraria o estoque incorretamente.
--
-- Impacto esperado:
--   Lotes onde quant_inicial já embute a apartação (categoria criada depois
--   da movimentação) terão quant_atual corrigido para quant_inicial + apenas
--   movimentações posteriores. Lotes normais (categoria criada antes das
--   movimentações) não são afetados porque todas as movimentações são >= created_at.

CREATE OR REPLACE FUNCTION public.calculate_quant_atual(p_lote_id uuid, p_categoria text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
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
  -- Get quant_inicial (raw) e created_at from lote_categorias (apenas ativas, case-insensitive)
  SELECT quant_inicial, created_at
  INTO v_quant_inicial_raw, v_created_at
  FROM lote_categorias
  WHERE lote_id = p_lote_id AND LOWER(categoria) = LOWER(p_categoria)
    AND ativo = true
  LIMIT 1;

  -- Se não encontrou categoria ativa, retorna 0
  IF v_created_at IS NULL THEN
    RETURN 0;
  END IF;

  v_quant_inicial := COALESCE(v_quant_inicial_raw, 0);

  -- Se quant_inicial IS NULL, desativar o filtro de data: não há quant_inicial
  -- para duplicar, então todas as movimentações/maternidades contam (comportamento
  -- original). Caso típico: bezerro/bezerra ao pé onde o estoque vem da maternidade.
  IF v_quant_inicial_raw IS NULL THEN
    v_date_cutoff := '1900-01-01'::timestamptz;
  ELSE
    v_date_cutoff := v_created_at;
  END IF;

  -- Sum entradas from registros_movimentacao (case-insensitive, apenas posteriores à criação)
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_entradas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND motivo_movimentacao = 'Entrada'
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  -- Sum saidas (consumo, saída, entrevero without destination) - EXCLUDE transfers
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_saidas
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (motivo_movimentacao IN ('Consumo', 'Saída') OR (motivo_movimentacao = 'Entrevero' AND lote_destino_id IS NULL))
    AND tipo_saida IS NULL
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  -- Sum transferências saida (source)
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_saida
  FROM registros_movimentacao
  WHERE lote_origem_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND (tipo_saida IN ('Transferência', 'Apartação') OR (motivo_movimentacao = 'Entrevero' AND lote_destino_id IS NOT NULL))
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  -- Sum transferências entrada (destination)
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_entrada
  FROM registros_movimentacao
  WHERE lote_destino_id = p_lote_id
    AND (tipo_entrada IN ('Transferência', 'Apartação') OR motivo_movimentacao = 'Entrevero' OR (tipo_entrada IS NULL AND lote_destino_id IS NOT NULL))
    AND data >= v_date_cutoff
    AND deleted_at IS NULL;

  -- Count maternidade based on category (sex-specific for calf categories, zero for others)
  IF LOWER(p_categoria) = 'bezerro ao pé' THEN
    SELECT COUNT(*) INTO v_maternidade_count
    FROM registros_maternidade
    WHERE lote_id = p_lote_id AND sexo = 'Macho' AND data >= v_date_cutoff AND deleted_at IS NULL;
  ELSIF LOWER(p_categoria) = 'bezerra ao pé' THEN
    SELECT COUNT(*) INTO v_maternidade_count
    FROM registros_maternidade
    WHERE lote_id = p_lote_id AND sexo = 'Fêmea' AND data >= v_date_cutoff AND deleted_at IS NULL;
  ELSE
    v_maternidade_count := 0;
  END IF;

  -- Count morte (case-insensitive, apenas posteriores à criação)
  SELECT COUNT(*) INTO v_morte_count
  FROM registros_morte
  WHERE lote_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
    AND data >= v_date_cutoff
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
  'Calcula quant_atual de uma categoria ativa de um lote. Filtra movimentações, mortes e maternidades por data >= created_at da lote_categorias para evitar dupla contagem quando a categoria nasce de uma apartação/transferência (quant_inicial já reflete os animais transferidos). Exceção: quando quant_inicial IS NULL, o filtro de data é desativado (categorias de bezerro/bezerra ao pé cujo estoque vem da maternidade).';
