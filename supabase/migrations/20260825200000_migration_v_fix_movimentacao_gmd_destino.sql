-- Migration V: Movimentacao que gera nova categoria usa GMD da formulacao do lote destino
--
-- Bug: ao criar uma nova categoria no lote destino via movimentacao, a funcao
-- update_quant_atual_movimentacao copiava o gmd do lote origem (v_source_cat.gmd).
-- No novo modelo, o GMD deve vir da formulacao do lote destino (formulacao_categorias_gmd).
--
-- Fix: buscar v_dest_lote.formulacao_id e v_dest_gmd de formulacao_categorias_gmd
-- para a categoria da movimentacao. Setar formulacao_id e estrategia_nutricional
-- do lote destino na nova categoria. Se a categoria nao for coberta pela formulacao
-- do destino, gmd = NULL (para weight evolution, nao evolui).

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
  v_dest_form RECORD;
  v_dest_gmd numeric;
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

      -- Buscar formulacao e GMD do lote destino (nova regra: GMD vem da formulacao do lote destino)
      SELECT * INTO v_dest_lote FROM lotes WHERE id = NEW.lote_destino_id;
      v_dest_gmd := NULL;
      IF v_dest_lote.formulacao_id IS NOT NULL THEN
        SELECT fcg.gmd INTO v_dest_gmd
        FROM formulacao_categorias_gmd fcg
        WHERE fcg.formulacao_id = v_dest_lote.formulacao_id
          AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(NEW.categoria));
        SELECT * INTO v_dest_form FROM formulacoes WHERE id = v_dest_lote.formulacao_id;
      END IF;

      -- created_at = NEW.data + 1 segundo: garante que a movimentação originadora
      -- tenha data < created_at e seja filtrada por calculate_quant_atual,
      -- evitando dupla contagem (quant_inicial já captura o numero_cabecas).
      v_created_at := COALESCE(NEW.data, now()) + interval '1 second';

      -- Create new category with quant_inicial = numero_cabecas (preserva info de origem)
      -- e quant_atual = numero_cabecas (valor imediato para o usuário)
      -- e created_at = data_movimento + 1s (para filtro da função)
      -- e data_pesagem = data da movimentação (não a do lote origem)
      -- e gmd = GMD da formulacao do lote destino (não do lote origem)
      -- e formulacao_id = formulacao do lote destino
      -- e estrategia_nutricional = nome da formulacao do lote destino
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
        COALESCE(v_dest_form.nome, v_source_cat.estrategia_nutricional),
        v_dest_lote.formulacao_id,
        v_source_cat.raca, v_source_cat.sexo, v_source_cat.idade, true, v_created_at
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
