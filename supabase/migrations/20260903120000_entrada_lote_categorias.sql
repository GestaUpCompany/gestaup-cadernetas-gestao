-- Migração: Entrada de animais com criação/ponderação de lote_categorias
-- Data: 2026-09-03
--
-- Objetivo: quando motivo_movimentacao = 'Entrada', a trigger deve:
--   1. Se a categoria NÃO existe no lote (lote_origem_id = lote destino):
--      criar lote_categorias com quant_inicial = numero_cabecas,
--      peso_entrada_kg_cab = peso_vivo_atual_kg, peso_vivo_atual_kg_cab = peso_vivo_atual_kg,
--      raca/sexo/idade do registro, data_pesagem = data do registro.
--   2. Se a categoria JÁ existe no lote:
--      somar quant_atual via calculate_quant_atual e ponderar peso_vivo_atual_kg_cab.
--
-- Para outros motivos (Saída, Consumo, Entrevero, etc.): comportamento inalterado.

-- ============================================================================
-- PASSO 1: Adicionar colunas raca, sexo, idade em registros_movimentacao
-- ============================================================================

ALTER TABLE public.registros_movimentacao
  ADD COLUMN IF NOT EXISTS raca text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sexo text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS idade integer DEFAULT NULL;

-- ============================================================================
-- PASSO 2: Modificar a função update_quant_atual_movimentacao
-- ============================================================================

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
  v_dest_lote RECORD;
  v_dest_form_nome text;
  v_dest_gmd numeric;
  v_created_at timestamptz;
  -- Variáveis para Entrada
  v_existing_cat RECORD;
  v_old_quant integer;
  v_old_peso numeric;
  v_new_peso numeric;
BEGIN
  IF NEW.categoria IS NULL OR NEW.lote_origem_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT fazenda_id INTO v_fazenda_id FROM lotes WHERE id = NEW.lote_origem_id LIMIT 1;

  -- =========================================================================
  -- BLOCO ENTRADA: motivo_movimentacao = 'Entrada'
  -- lote_origem_id = lote que recebe os animais (destino)
  -- =========================================================================
  IF NEW.motivo_movimentacao = 'Entrada' THEN

    -- Verificar se a categoria já existe no lote
    SELECT * INTO v_existing_cat
    FROM lote_categorias
    WHERE lote_id = NEW.lote_origem_id
      AND LOWER(categoria) = LOWER(NEW.categoria)
      AND ativo = true
    LIMIT 1;

    IF v_existing_cat.id IS NULL THEN
      -- Categoria NÃO existe: criar nova lote_categorias
      -- peso_entrada_kg_cab = peso_vivo_atual_kg (peso inicial = peso atual informado)
      -- quant_inicial = numero_cabecas (nasce com o valor de entrada, calculate_quant_atual somará futuras entradas)
      -- created_at deslocado 1 segundo para que calculate_quant_atual não conte este registro duas vezes
      v_created_at := COALESCE(NEW.data, now()) + interval '1 second';

      INSERT INTO lote_categorias (
        lote_id, categoria, quant_inicial, quant_atual,
        data_pesagem, peso_entrada_kg_cab, peso_vivo_atual_kg_cab,
        raca, sexo, idade, ativo, created_at
      ) VALUES (
        NEW.lote_origem_id, NEW.categoria, NEW.numero_cabecas, NEW.numero_cabecas,
        COALESCE(NEW.data, now())::date, NEW.peso_vivo_atual_kg, NEW.peso_vivo_atual_kg,
        NEW.raca, NEW.sexo, NEW.idade, true, v_created_at
      );
    ELSE
      -- Categoria JÁ existe: somar cabeças e ponderar peso
      v_old_quant := COALESCE(v_existing_cat.quant_atual, 0);
      v_old_peso := v_existing_cat.peso_vivo_atual_kg_cab;

      -- Recalcular quant_atual (calculate_quant_atual já soma registros de Entrada)
      UPDATE lote_categorias
      SET quant_atual = calculate_quant_atual(NEW.lote_origem_id, NEW.categoria)
      WHERE lote_id = NEW.lote_origem_id
        AND LOWER(categoria) = LOWER(NEW.categoria)
        AND ativo = true;

      -- Ponderar peso: ((old_quant * old_peso) + (new_cabecas * new_peso)) / (old_quant + new_cabecas)
      IF v_old_quant > 0 AND v_old_peso IS NOT NULL THEN
        v_new_peso := ((v_old_quant * v_old_peso) + (NEW.numero_cabecas * NEW.peso_vivo_atual_kg))
                      / (v_old_quant + NEW.numero_cabecas);
      ELSE
        -- Se old_quant = 0 ou old_peso NULL, o novo peso é simplesmente o informado
        v_new_peso := NEW.peso_vivo_atual_kg;
      END IF;

      UPDATE lote_categorias
      SET peso_vivo_atual_kg_cab = v_new_peso
      WHERE lote_id = NEW.lote_origem_id
        AND LOWER(categoria) = LOWER(NEW.categoria)
        AND ativo = true;
    END IF;

    RETURN NEW;
  END IF;

  -- =========================================================================
  -- BLOCO ORIGINAL: Saída, Consumo, Entrevero, Doação, etc.
  -- (código inalterado a partir daqui)
  -- =========================================================================

  SELECT EXISTS(
    SELECT 1 FROM lote_categorias
    WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria)
  ) INTO v_cat_exists;

  IF NOT v_cat_exists THEN
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

  UPDATE lote_categorias
  SET quant_atual = calculate_quant_atual(NEW.lote_origem_id, NEW.categoria)
  WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;

  IF NEW.lote_destino_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM lote_categorias
      WHERE lote_id = NEW.lote_destino_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true
    ) THEN
      SELECT * INTO v_source_cat
      FROM lote_categorias
      WHERE lote_id = NEW.lote_origem_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;

      SELECT * INTO v_dest_lote FROM lotes WHERE id = NEW.lote_destino_id;
      v_dest_gmd := NULL;
      v_dest_form_nome := NULL;
      IF v_dest_lote.formulacao_id IS NOT NULL THEN
        SELECT fcg.gmd INTO v_dest_gmd
        FROM formulacao_categorias_gmd fcg
        WHERE fcg.formulacao_id = v_dest_lote.formulacao_id
          AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(NEW.categoria));
        SELECT nome INTO v_dest_form_nome FROM formulacoes WHERE id = v_dest_lote.formulacao_id;
      END IF;

      v_created_at := COALESCE(NEW.data, now()) + interval '1 second';

      INSERT INTO lote_categorias (
        lote_id, categoria, quant_inicial, quant_atual,
        data_pesagem, peso_entrada_kg_cab, peso_entrada_arrobas, gmd, periodo,
        rc_inicial, peso_vivo_atual_kg_cab, peso_vivo_meta_kg_cab, dias_restantes_meta,
        estrategia_nutricional, formulacao_id, raca, sexo, idade, ativo, created_at
      ) VALUES (
        NEW.lote_destino_id, NEW.categoria, NEW.numero_cabecas, NEW.numero_cabecas,
        NEW.data, v_source_cat.peso_entrada_kg_cab, v_source_cat.peso_entrada_arrobas,
        CASE WHEN v_dest_gmd IS NOT NULL THEN v_dest_gmd::text ELSE NULL END,
        v_source_cat.periodo, v_source_cat.rc_inicial,
        v_source_cat.peso_vivo_atual_kg_cab, v_source_cat.peso_vivo_meta_kg_cab, v_source_cat.dias_restantes_meta,
        COALESCE(v_dest_form_nome, v_source_cat.estrategia_nutricional),
        v_dest_lote.formulacao_id,
        v_source_cat.raca, v_source_cat.sexo, v_source_cat.idade, true, v_created_at
      );
    ELSE
      UPDATE lote_categorias
      SET quant_atual = calculate_quant_atual(lote_id, categoria)
      WHERE lote_id = NEW.lote_destino_id AND LOWER(categoria) = LOWER(NEW.categoria) AND ativo = true;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
