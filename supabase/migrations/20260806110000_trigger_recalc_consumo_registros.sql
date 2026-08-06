-- Migration: Trigger para recalcular dados de consumo em registros_suplementacao
-- quando parâmetros da formulação são editados ou quando peso_vivo_kg muda.
--
-- Problema: o trigger calcular_consumo_registro_anterior só dispara em INSERT,
-- não em UPDATE. Quando teor_ms_dieta, custo_mn_tonelada (da formulação) ou
-- peso_vivo_kg (do registro) são editados depois, os campos consumo_kg_ms,
-- consumo_pct_pv e custo_medio ficam desatualizados.
--
-- Solução: dois triggers adicionais:
-- 1. Trigger em formulacoes (AFTER UPDATE OF teor_ms_dieta, custo_mn_tonelada)
--    que recalcula consumo de todos os registros que usam essa formulação.
-- 2. Trigger em registros_suplementacao (AFTER UPDATE OF peso_vivo_kg)
--    que recalcula apenas consumo_pct_pv do próprio registro.

-- ============================================================
-- 1. Função para recalcular consumo de registros por formulação
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalcular_consumo_por_formulacao(p_fazenda_id uuid, p_formulacao_nome text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_teor_ms numeric;
  v_custo_mn_tonelada numeric;
BEGIN
  -- Buscar parâmetros atuais da formulação
  SELECT f.teor_ms_dieta, f.custo_mn_tonelada
  INTO v_teor_ms, v_custo_mn_tonelada
  FROM formulacoes f
  WHERE f.fazenda_id = p_fazenda_id
    AND f.nome = p_formulacao_nome
    AND f.ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Recalcular consumo_kg_ms, consumo_pct_pv e custo_medio
  -- para todos os registros com consumo_kg_mn já calculado
  UPDATE registros_suplementacao rs
  SET
    consumo_medio_geral_kg_ms = CASE
      WHEN v_teor_ms IS NOT NULL AND v_teor_ms > 0
      THEN ROUND((rs.consumo_medio_geral_kg_mn * v_teor_ms / 100)::numeric, 6)
      ELSE NULL
    END,
    consumo_medio_30dias_kg_ms = CASE
      WHEN v_teor_ms IS NOT NULL AND v_teor_ms > 0
      THEN ROUND((rs.consumo_medio_geral_kg_mn * v_teor_ms / 100)::numeric, 6)
      ELSE NULL
    END,
    consumo_medio_geral_percent_pv = CASE
      WHEN v_teor_ms IS NOT NULL AND v_teor_ms > 0
        AND rs.peso_vivo_kg IS NOT NULL AND rs.peso_vivo_kg > 0
      THEN ROUND(((rs.consumo_medio_geral_kg_mn * v_teor_ms / 100) / rs.peso_vivo_kg * 100)::numeric, 6)
      ELSE NULL
    END,
    consumo_medio_30dias_percent_pv = CASE
      WHEN v_teor_ms IS NOT NULL AND v_teor_ms > 0
        AND rs.peso_vivo_kg IS NOT NULL AND rs.peso_vivo_kg > 0
      THEN ROUND(((rs.consumo_medio_geral_kg_mn * v_teor_ms / 100) / rs.peso_vivo_kg * 100)::numeric, 6)
      ELSE NULL
    END,
    custo_medio_reais_cab_dia = CASE
      WHEN v_custo_mn_tonelada IS NOT NULL
      THEN ROUND((v_custo_mn_tonelada * rs.consumo_medio_geral_kg_mn / 1000)::numeric, 6)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE rs.fazenda_id = p_fazenda_id
    AND rs.formulacao = p_formulacao_nome
    AND rs.deleted_at IS NULL
    AND rs.consumo_medio_geral_kg_mn IS NOT NULL;
END;
$function$;

-- ============================================================
-- 2. Trigger em formulacoes
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_recalc_consumo_formulacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Só recalcular se teor_ms_dieta ou custo_mn_tonelada mudaram
  IF NEW.teor_ms_dieta IS DISTINCT FROM OLD.teor_ms_dieta
     OR NEW.custo_mn_tonelada IS DISTINCT FROM OLD.custo_mn_tonelada THEN
    PERFORM recalcular_consumo_por_formulacao(NEW.fazenda_id, NEW.nome);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_consumo_formulacao ON public.formulacoes;
CREATE TRIGGER trigger_recalc_consumo_formulacao
  AFTER UPDATE OF teor_ms_dieta, custo_mn_tonelada
  ON public.formulacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_consumo_formulacao();

-- ============================================================
-- 3. Trigger em registros_suplementacao para recalcular pct_pv
--    quando peso_vivo_kg é atualizado
-- ============================================================
-- Quando a trigger recalcular_peso_vivo_lote atualiza peso_vivo_kg,
-- o consumo_pct_pv do próprio registro deve ser recalculado.
-- O consumo_kg_ms e custo_medio não dependem do peso, então não mudam.

CREATE OR REPLACE FUNCTION public.trigger_recalc_pct_pv_on_peso_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_teor_ms numeric;
  v_novo_pct_pv numeric;
BEGIN
  -- Só recalcular se peso_vivo_kg mudou e o registro tem consumo
  IF NEW.peso_vivo_kg IS DISTINCT FROM OLD.peso_vivo_kg
     AND NEW.consumo_medio_geral_kg_mn IS NOT NULL
     AND NEW.peso_vivo_kg IS NOT NULL AND NEW.peso_vivo_kg > 0 THEN

    -- Buscar teor_ms da formulação
    SELECT f.teor_ms_dieta INTO v_teor_ms
    FROM formulacoes f
    WHERE f.fazenda_id = NEW.fazenda_id
      AND f.nome = NEW.formulacao
      AND f.ativo = true
    LIMIT 1;

    IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
      v_novo_pct_pv := ROUND(((NEW.consumo_medio_geral_kg_mn * v_teor_ms / 100) / NEW.peso_vivo_kg * 100)::numeric, 6);

      NEW.consumo_medio_geral_percent_pv := v_novo_pct_pv;
      NEW.consumo_medio_30dias_percent_pv := v_novo_pct_pv;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_pct_pv_on_peso_change ON public.registros_suplementacao;
CREATE TRIGGER trigger_recalc_pct_pv_on_peso_change
  BEFORE UPDATE OF peso_vivo_kg
  ON public.registros_suplementacao
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_pct_pv_on_peso_change();
