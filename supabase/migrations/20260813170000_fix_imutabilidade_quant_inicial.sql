-- Fix: imutabilidade do quant_inicial + filtro de data + auto-criação com created_at correto
--
-- Princípio: quant_inicial é o número de cabeças no momento em que a categoria
-- nasceu no lote (criação manual ou auto-criação por movimentação). Esse valor
-- é fixado na criação e nunca muda. quant_atual é sempre derivado das
-- movimentações posteriores à criação, nunca setado manualmente pelo usuário.
--
-- Camadas implementadas:
-- 1. Trigger update_quant_atual_movimentacao: auto-cria categoria com
--    created_at = NEW.data + 1 segundo, garantindo que a movimentação
--    originadora sempre tenha data < created_at e seja filtrada pela função.
-- 2. Lock no banco: trigger BEFORE UPDATE impede alteração de quant_inicial
--    após a criação (quando já não é NULL).
-- 3. Função calculate_quant_atual: reativa filtro data >= created_at em todas
--    as queries de movimentação, morte e maternidade. Mantém o filtro de
--    categoria em transf_entrada (Bug #1). Quando quant_inicial IS NULL,
--    desativa o filtro de data (caso de bezerro/bezerra ao pé cujo estoque
--    vem da maternidade).
--
-- Passivo (categorias com created_at resetado pelo bug de edição antigo)
-- NÃO é corrigido nesta migration. Será tratado separadamente.

-- =============================================================================
-- CAMADA 1: Trigger - auto-criar categoria com created_at = NEW.data + 1s
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_quant_atual_movimentacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_cat_exists boolean;
  v_fazenda_id uuid;
  v_source_cat RECORD;
  v_created_at timestamptz;
BEGIN
  -- Skip if no categoria or no lote_origem_id
  IF NEW.categoria IS NULL OR NEW.lote_origem_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the categoria exists in lote_categorias for the source lot (case-insensitive, any ativo state)
  SELECT EXISTS(
    SELECT 1 FROM lote_categorias
    WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria)
  ) INTO v_cat_exists;

  -- Get fazenda_id from the source lote
  SELECT fazenda_id INTO v_fazenda_id FROM lotes WHERE id = NEW.lote_origem_id LIMIT 1;

  IF NOT v_cat_exists THEN
    -- Log the mismatch: categoria in registro does not match any categoria in lote_categorias
    INSERT INTO logs_sync_errors (fazenda_id, caderneta, registro_id, operation, error_code, error_message, error_details, payload)
    VALUES (
      v_fazenda_id,
      'movimentacao',
      NEW.id::text,
      'trigger_update_quant_atual_movimentacao',
      'CATEGORIA_NOT_IN_LOTE',
      'Categoria do registro de movimentacao nao existe no lote_categorias do lote origem',
      'Lote origem: ' || COALESCE(NEW.lote_origem, 'NULL') || ' | Categoria registro: ' || COALESCE(NEW.categoria, 'NULL') || ' | Motivo: ' || COALESCE(NEW.motivo_movimentacao::text, 'NULL') || ' | Cabecas: ' || COALESCE(NEW.numero_cabecas::text, 'NULL'),
      jsonb_build_object('lote_origem_id', NEW.lote_origem_id, 'lote_destino_id', NEW.lote_destino_id, 'categoria', NEW.categoria, 'motivo_movimentacao', NEW.motivo_movimentacao, 'numero_cabecas', NEW.numero_cabecas, 'nome_usuario', NEW.nome_usuario)
    );
    RETURN NEW;
  END IF;

  -- Update quant_atual for source lot (lote_origem_id) - case-insensitive
  UPDATE lote_categorias
  SET quant_atual = calculate_quant_atual(NEW.lote_origem_id, NEW.categoria)
  WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;

  -- Update quant_atual for destination lot (lote_destino_id)
  IF NEW.lote_destino_id IS NOT NULL THEN
    -- Check if category exists in destination lot (ativa)
    IF NOT EXISTS (
      SELECT 1 FROM lote_categorias
      WHERE lote_id = NEW.lote_destino_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true
    ) THEN
      -- Fetch source category data
      SELECT * INTO v_source_cat
      FROM lote_categorias
      WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;

      -- created_at = NEW.data + 1 segundo: garante que a movimentação originadora
      -- tenha data < created_at e seja filtrada por calculate_quant_atual,
      -- evitando dupla contagem (quant_inicial já captura o numero_cabecas).
      v_created_at := COALESCE(NEW.data, now()) + interval '1 second';

      -- Create new category with quant_inicial = numero_cabecas (preserva info de origem)
      -- e quant_atual = numero_cabecas (valor imediato para o usuário)
      -- e created_at = data_movimento + 1s (para filtro da função)
      -- e data_pesagem = data da movimentação (não a do lote origem)
      INSERT INTO lote_categorias (
        lote_id, categoria, quant_inicial, quant_atual,
        data_pesagem, peso_entrada_kg_cab, peso_entrada_arrobas, gmd, periodo,
        rc_inicial, peso_vivo_atual_kg_cab, peso_vivo_meta_kg_cab, dias_restantes_meta,
        estrategia_nutricional, raca, sexo, idade, ativo, created_at
      ) VALUES (
        NEW.lote_destino_id, NEW.categoria, NEW.numero_cabecas, NEW.numero_cabecas,
        NEW.data, v_source_cat.peso_entrada_kg_cab, v_source_cat.peso_entrada_arrobas,
        v_source_cat.gmd, v_source_cat.periodo, v_source_cat.rc_inicial,
        v_source_cat.peso_vivo_atual_kg_cab, v_source_cat.peso_vivo_meta_kg_cab, v_source_cat.dias_restantes_meta,
        v_source_cat.estrategia_nutricional, v_source_cat.raca,
        v_source_cat.sexo, v_source_cat.idade, true, v_created_at
      );
    ELSE
      -- Update quant_atual for the affected category in destination lot only
      UPDATE lote_categorias
      SET quant_atual = calculate_quant_atual(lote_id, categoria)
      WHERE lote_id = NEW.lote_destino_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- =============================================================================
-- CAMADA 2: Lock - quant_inicial imutável após criação
-- =============================================================================

CREATE OR REPLACE FUNCTION public.lock_quant_inicial()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Impede alteração de quant_inicial após ter sido definido (não-NULL).
  -- Permite setar quant_inicial de NULL para um valor (primeira definição).
  -- Permite manter o mesmo valor (UPDATEs de outros campos não são afetados).
  IF OLD.quant_inicial IS NOT NULL AND NEW.quant_inicial IS DISTINCT FROM OLD.quant_inicial THEN
    RAISE EXCEPTION 'quant_inicial é imutável após a criação da categoria (valor atual: %). Use movimentações para ajustar o quant_atual.', OLD.quant_inicial;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_lock_quant_inicial ON public.lote_categorias;
CREATE TRIGGER trg_lock_quant_inicial
  BEFORE UPDATE ON public.lote_categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_quant_inicial();

-- =============================================================================
-- CAMADA 3: Função - reativar filtro data >= created_at + manter filtro categoria
-- =============================================================================

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

  -- Sum transferências entrada (destination) - filtra por categoria (Bug #1 fix)
  SELECT COALESCE(SUM(numero_cabecas), 0) INTO v_sum_transf_entrada
  FROM registros_movimentacao
  WHERE lote_destino_id = p_lote_id
    AND LOWER(categoria) = LOWER(p_categoria)
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
  'Calcula quant_atual de uma categoria ativa de um lote. Soma quant_inicial + entradas - saídas - transf_saída + transf_entrada + maternidade - mortes. Filtra movimentações, mortes e maternidades por data >= created_at da lote_categorias (movimentações anteriores à criação já estão refletidas no quant_inicial). Exceção: quando quant_inicial IS NULL, o filtro de data é desativado. Todas as queries de movimentação filtram por categoria (case-insensitive), incluindo transf_entrada.';
