-- RPCs para editar e excluir (soft-delete) registros de suplementação no painel web.
--
-- Contexto: o PWA grava registros em registros_suplementacao mas não tem fluxo
-- de edição/exclusão. Quando o peão erra, o controller precisa corrigir
-- diretamente no banco. Estas RPCs encapsulam update + recálculo de consumo em
-- transação atômica, garantindo consistência da série (lote+formulação) sem
-- intervenção manual.
--
-- Funções criadas:
-- 1. recalc_consumo_series(fazenda_id, lote_id, formulacao) — helper que
--    recalcula consumo de toda a série ordenada por data.
-- 2. editar_registro_suplementacao(id, fazenda_id, usuario_id, email, campos)
--    — UPDATE com whitelist + recálculo de peso (se data mudou) + recálculo
--    de consumo das séries afetadas.
-- 3. excluir_registro_suplementacao(id, fazenda_id, usuario_id, email)
--    — soft-delete + recálculo de consumo da série. Restrito a controller+.

-- ============================================================
-- 1. Helper: recalc_consumo_series
-- ============================================================

-- Nota: usa variáveis individuais em vez de RECORD para v_prev porque
-- a atribuição v_prev := v_curr com RECORD não persiste entre iterações
-- do FOR loop no Postgres 17 (bug confirmado em testes na fazenda de testes).
CREATE OR REPLACE FUNCTION public.recalc_consumo_series(
  p_fazenda_id uuid,
  p_lote_id uuid,
  p_formulacao text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_curr_id uuid;
  v_curr_data timestamptz;
  v_curr_kg_cocho numeric;
  v_curr_n_cabecas integer;
  v_curr_qtd_bezerros integer;
  v_curr_peso_vivo_kg numeric;
  v_prev_id uuid := NULL;
  v_prev_data timestamptz := NULL;
  v_prev_kg_cocho numeric := NULL;
  v_prev_n_cabecas integer := NULL;
  v_prev_qtd_bezerros integer := NULL;
  v_prev_peso_vivo_kg numeric := NULL;
  v_dias integer;
  v_animais_elegiveis integer;
  v_consumo_kg_mn numeric;
  v_consumo_kg_ms numeric;
  v_consumo_pct_pv numeric;
  v_custo_medio numeric;
  v_teor_ms numeric;
  v_custo_mn_tonelada numeric;
  v_has_prev boolean := false;
BEGIN
  -- Séries incompletas não têm consumo calculado
  IF p_lote_id IS NULL OR p_formulacao IS NULL THEN
    RETURN;
  END IF;

  -- Buscar parâmetros atuais da formulação
  SELECT f.teor_ms_dieta, f.custo_mn_tonelada
  INTO v_teor_ms, v_custo_mn_tonelada
  FROM formulacoes f
  WHERE f.fazenda_id = p_fazenda_id
    AND f.nome = p_formulacao
    AND f.ativo = true
  LIMIT 1;

  v_has_prev := false;

  FOR v_curr_id, v_curr_data, v_curr_kg_cocho, v_curr_n_cabecas, v_curr_qtd_bezerros, v_curr_peso_vivo_kg IN
    SELECT id, data, kg_cocho, n_cabecas, qtd_bezerros, peso_vivo_kg
    FROM registros_suplementacao
    WHERE fazenda_id = p_fazenda_id
      AND lote_id = p_lote_id
      AND formulacao = p_formulacao
      AND deleted_at IS NULL
    ORDER BY data ASC, created_at ASC
  LOOP
    -- Se há registro anterior, recalcular consumo do anterior usando v_curr como "próximo"
    IF v_has_prev THEN
      v_animais_elegiveis := COALESCE(v_prev_n_cabecas, 0) - COALESCE(v_prev_qtd_bezerros, 0);

      IF v_animais_elegiveis > 0
         AND v_prev_kg_cocho IS NOT NULL
         AND v_prev_kg_cocho > 0 THEN

        v_dias := GREATEST((v_curr_data::date - v_prev_data::date), 1);
        v_consumo_kg_mn := v_prev_kg_cocho / v_dias / v_animais_elegiveis;

        IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
          v_consumo_kg_ms := v_consumo_kg_mn * (v_teor_ms / 100);
        ELSE
          v_consumo_kg_ms := NULL;
        END IF;

        IF v_consumo_kg_ms IS NOT NULL
           AND v_prev_peso_vivo_kg IS NOT NULL
           AND v_prev_peso_vivo_kg > 0 THEN
          v_consumo_pct_pv := (v_consumo_kg_ms / v_prev_peso_vivo_kg) * 100;
        ELSE
          v_consumo_pct_pv := NULL;
        END IF;

        IF v_custo_mn_tonelada IS NOT NULL THEN
          v_custo_medio := (v_custo_mn_tonelada * v_consumo_kg_mn) / 1000;
        ELSE
          v_custo_medio := NULL;
        END IF;

        UPDATE registros_suplementacao
        SET
          consumo_medio_geral_kg_mn = v_consumo_kg_mn,
          consumo_medio_30dias_kg_mn = v_consumo_kg_mn,
          consumo_medio_geral_kg_ms = v_consumo_kg_ms,
          consumo_medio_30dias_kg_ms = v_consumo_kg_ms,
          consumo_medio_geral_percent_pv = v_consumo_pct_pv,
          consumo_medio_30dias_percent_pv = v_consumo_pct_pv,
          custo_medio_reais_cab_dia = v_custo_medio,
          updated_at = NOW()
        WHERE id = v_prev_id;
      ELSE
        -- Sem kg_cocho ou sem animais elegíveis: consumo NULL
        UPDATE registros_suplementacao
        SET
          consumo_medio_geral_kg_mn = NULL,
          consumo_medio_30dias_kg_mn = NULL,
          consumo_medio_geral_kg_ms = NULL,
          consumo_medio_30dias_kg_ms = NULL,
          consumo_medio_geral_percent_pv = NULL,
          consumo_medio_30dias_percent_pv = NULL,
          custo_medio_reais_cab_dia = NULL,
          updated_at = NOW()
        WHERE id = v_prev_id;
      END IF;
    END IF;

    v_prev_id := v_curr_id;
    v_prev_data := v_curr_data;
    v_prev_kg_cocho := v_curr_kg_cocho;
    v_prev_n_cabecas := v_curr_n_cabecas;
    v_prev_qtd_bezerros := v_curr_qtd_bezerros;
    v_prev_peso_vivo_kg := v_curr_peso_vivo_kg;
    v_has_prev := true;
  END LOOP;

  -- O último registro da série fica com consumo NULL (sem próximo para calcular)
  IF v_has_prev THEN
    UPDATE registros_suplementacao
    SET
      consumo_medio_geral_kg_mn = NULL,
      consumo_medio_30dias_kg_mn = NULL,
      consumo_medio_geral_kg_ms = NULL,
      consumo_medio_30dias_kg_ms = NULL,
      consumo_medio_geral_percent_pv = NULL,
      consumo_medio_30dias_percent_pv = NULL,
      custo_medio_reais_cab_dia = NULL,
      updated_at = NOW()
    WHERE id = v_prev_id;
  END IF;
END;
$function$;

-- ============================================================
-- 2. editar_registro_suplementacao
-- ============================================================

CREATE OR REPLACE FUNCTION public.editar_registro_suplementacao(
  p_id uuid,
  p_fazenda_id uuid,
  p_usuario_id uuid,
  p_usuario_email text,
  p_campos jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old registros_suplementacao%ROWTYPE;
  v_new_rec registros_suplementacao%ROWTYPE;
  v_filtered jsonb := '{}'::jsonb;
  v_campo text;
  v_campos_permitidos text[] := ARRAY[
    'data','tratador','pasto','pasto_id','lote','lote_id',
    'formulacao','categorias','kg_cocho','kg_deposito',
    'n_cabecas','qtd_bezerros','leitura','escore_fezes','checklist'
  ];
  v_old_lote_id uuid;
  v_old_formulacao text;
  v_new_lote_id uuid;
  v_new_formulacao text;
BEGIN
  -- Configurar contexto de auditoria (lido por fn_audit_trigger)
  PERFORM set_config('app.current_user_id', p_usuario_id::text, true);
  PERFORM set_config('app.current_user_email', COALESCE(p_usuario_email, ''), true);

  -- Buscar registro atual
  SELECT * INTO v_old FROM registros_suplementacao
  WHERE id = p_id AND fazenda_id = p_fazenda_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado ou já excluído';
  END IF;

  v_old_lote_id := v_old.lote_id;
  v_old_formulacao := v_old.formulacao;

  -- Filtrar p_campos para apenas campos permitidos (whitelist)
  FOR v_campo IN SELECT jsonb_object_keys(p_campos) LOOP
    IF v_campo = ANY(v_campos_permitidos) THEN
      v_filtered := v_filtered || jsonb_build_object(v_campo, p_campos->v_campo);
    END IF;
  END LOOP;

  -- Aplicar campos filtrados sobre o record existente e fazer UPDATE
  v_new_rec := jsonb_populate_record(v_old, v_filtered);

  UPDATE registros_suplementacao SET
    data = v_new_rec.data,
    tratador = v_new_rec.tratador,
    pasto = v_new_rec.pasto,
    pasto_id = v_new_rec.pasto_id,
    lote = v_new_rec.lote,
    lote_id = v_new_rec.lote_id,
    formulacao = v_new_rec.formulacao,
    categorias = v_new_rec.categorias,
    kg_cocho = v_new_rec.kg_cocho,
    kg_deposito = v_new_rec.kg_deposito,
    n_cabecas = v_new_rec.n_cabecas,
    qtd_bezerros = v_new_rec.qtd_bezerros,
    leitura = v_new_rec.leitura,
    escore_fezes = v_new_rec.escore_fezes,
    checklist = v_new_rec.checklist,
    updated_at = NOW()
  WHERE id = p_id AND fazenda_id = p_fazenda_id AND deleted_at IS NULL
  RETURNING * INTO v_new_rec;

  v_new_lote_id := v_new_rec.lote_id;
  v_new_formulacao := v_new_rec.formulacao;

  -- Se data mudou, recalcular peso_vivo_kg do lote contra o plano histórico
  IF v_new_rec.data IS DISTINCT FROM v_old.data THEN
    -- recalcular_pesos_suplementacao_historico recalcula peso de todos os
    -- registros do lote contra o plano que cobria a data de cada registro
    PERFORM recalcular_pesos_suplementacao_historico(p_fazenda_id, v_new_lote_id);
  END IF;

  -- Se lote ou formulacao mudou, recalcular consumo da série antiga
  IF v_new_lote_id IS DISTINCT FROM v_old_lote_id
     OR v_new_formulacao IS DISTINCT FROM v_old_formulacao THEN
    PERFORM recalc_consumo_series(p_fazenda_id, v_old_lote_id, v_old_formulacao);
  END IF;

  -- Recalcular consumo da série nova (sempre, pois kg_cocho/data/n_cabecas podem ter mudado)
  PERFORM recalc_consumo_series(p_fazenda_id, v_new_lote_id, v_new_formulacao);

  -- Re-buscar o registro para retornar o estado pós-recalc (consumo, peso_vivo atualizados)
  SELECT * INTO v_new_rec FROM registros_suplementacao WHERE id = p_id;

  RETURN to_jsonb(v_new_rec);
END;
$function$;

-- ============================================================
-- 3. excluir_registro_suplementacao
-- ============================================================

CREATE OR REPLACE FUNCTION public.excluir_registro_suplementacao(
  p_id uuid,
  p_fazenda_id uuid,
  p_usuario_id uuid,
  p_usuario_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old registros_suplementacao%ROWTYPE;
  v_lote_id uuid;
  v_formulacao text;
  v_is_controller boolean;
BEGIN
  -- Configurar contexto de auditoria
  PERFORM set_config('app.current_user_id', p_usuario_id::text, true);
  PERFORM set_config('app.current_user_email', COALESCE(p_usuario_email, ''), true);

  -- Verificar permissão: apenas controller+ pode excluir
  SELECT EXISTS(
    SELECT 1 FROM usuario_fazenda uf
    WHERE uf.usuario_id = p_usuario_id
      AND uf.fazenda_id = p_fazenda_id
      AND uf.papel IN ('admin', 'controller')
      AND uf.ativo = true
  ) INTO v_is_controller;

  IF NOT v_is_controller THEN
    RAISE EXCEPTION 'Permissão negada: apenas controllers e admins podem excluir registros de suplementação';
  END IF;

  -- Buscar registro para capturar lote_id e formulacao da série
  SELECT * INTO v_old FROM registros_suplementacao
  WHERE id = p_id AND fazenda_id = p_fazenda_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado ou já excluído';
  END IF;

  v_lote_id := v_old.lote_id;
  v_formulacao := v_old.formulacao;

  -- Soft-delete (trigger de auditoria dispara automaticamente)
  UPDATE registros_suplementacao
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_id AND fazenda_id = p_fazenda_id AND deleted_at IS NULL;

  -- Recalcular consumo da série (o próximo recalcula contra o anterior ao excluído)
  PERFORM recalc_consumo_series(p_fazenda_id, v_lote_id, v_formulacao);

  RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$function$;

-- ============================================================
-- Grants
-- ============================================================

GRANT EXECUTE ON FUNCTION public.recalc_consumo_series(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.editar_registro_suplementacao(uuid, uuid, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_registro_suplementacao(uuid, uuid, uuid, text) TO authenticated;
