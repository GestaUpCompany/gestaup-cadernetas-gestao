-- Espelha o guard CATEGORIA_NOT_IN_LOTE ja existente em update_quant_atual_morte()
-- para a funcao update_quant_atual_movimentacao().
--
-- Problema: 28 registros em producao tem categoria que nao existe em lote_categorias
-- para o lote origem. O UPDATE afeta 0 linhas silenciosamente, sem log.
-- Caso real documentado no AGENTS.md (morte, Fazenda Guanabara) se repete em movimentacao.

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

      -- Create new category with copied data and quant_atual = numero_cabecas
      INSERT INTO lote_categorias (
        lote_id, categoria, quant_inicial, quant_atual,
        data_pesagem, peso_entrada_kg_cab, peso_entrada_arrobas, gmd, periodo,
        rc_inicial, peso_vivo_atual_kg_cab, peso_vivo_meta_kg_cab, dias_restantes_meta,
        estrategia_nutricional, raca, sexo, idade, ativo
      ) VALUES (
        NEW.lote_destino_id, NEW.categoria, NEW.numero_cabecas, NEW.numero_cabecas,
        v_source_cat.data_pesagem, v_source_cat.peso_entrada_kg_cab, v_source_cat.peso_entrada_arrobas,
        v_source_cat.gmd, v_source_cat.periodo, v_source_cat.rc_inicial,
        v_source_cat.peso_vivo_atual_kg_cab, v_source_cat.peso_vivo_meta_kg_cab, v_source_cat.dias_restantes_meta,
        v_source_cat.estrategia_nutricional, v_source_cat.raca,
        v_source_cat.sexo, v_source_cat.idade, true
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
$function$;;
