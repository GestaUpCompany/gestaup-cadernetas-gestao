-- Migration: Trigger para recalcular peso_vivo_kg em registros_suplementacao
-- quando parâmetros do plano nutricional são editados retroativamente.
--
-- Problema: o PWA grava peso_vivo_kg no momento do registro usando os parâmetros
-- vigentes do plano. Se data_inicio, gmd_planejado, peso_inicio_kg_cab,
-- data_ajuste_peso ou peso_vivo_atual_kg_cab forem editados depois, os registros
-- antigos ficam com valores desatualizados.
--
-- Solução: triggers AFTER UPDATE que recalculam peso_vivo_kg de todos os registros
-- do lote afetado, usando a mesma fórmula do cron update_dados_lotes projetada
-- para a data de cada registro.
--
-- Atenção sobre data_ajuste_peso:
-- peso_vivo_atual_kg_cab tem semântica diferente dependendo de quem atualizou:
--   - Ajuste manual: peso_vivo_atual_kg_cab = peso na data_ajuste_peso
--   - Cron diário: peso_vivo_atual_kg_cab = peso projetado para hoje
-- A função recebe p_ajuste_manual para escolher a fórmula correta:
--   - Ajuste manual: peso_atual + gmd * (D - data_ajuste)  [peso_atual é base]
--   - Cron/outros:   peso_atual + gmd * (D - CURRENT_DATE)  [peso_atual é hoje]
-- Ambas produzem o mesmo resultado quando o cron tem corrido, pois
-- peso_atual(hoje) = peso_no_ajuste + gmd * (hoje - data_ajuste).

-- ============================================================
-- 1. Função compartilhada: recalcular_peso_vivo_lote
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalcular_peso_vivo_lote(p_lote_id uuid, p_ajuste_manual boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_peso_base numeric;
  v_data_inicio date;
  v_gmd numeric;
  v_data_ajuste date;
  v_peso_atual numeric;
BEGIN
  -- Buscar parâmetros do plano ativo do lote
  SELECT
    COALESCE(pn.peso_inicio_kg_cab, lc.peso_entrada_kg_cab),
    pn.data_inicio,
    COALESCE(pn.gmd_planejado, f.gmd),
    lc.data_ajuste_peso,
    lc.peso_vivo_atual_kg_cab
  INTO v_peso_base, v_data_inicio, v_gmd, v_data_ajuste, v_peso_atual
  FROM lote_categorias lc
  JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
  JOIN formulacoes f ON f.id = pn.formulacao_id
  WHERE lc.lote_id = p_lote_id
    AND lc.ativo = true
    AND lc.data_fim IS NULL
  LIMIT 1;

  -- Se não há plano ativo ou GMD, não há o que recalcular
  IF NOT FOUND OR v_gmd IS NULL THEN
    RETURN;
  END IF;

  -- Caso 1: data_ajuste_peso definida
  IF v_data_ajuste IS NOT NULL AND v_peso_atual IS NOT NULL THEN
    IF p_ajuste_manual THEN
      -- Ajuste manual: peso_vivo_atual_kg_cab é o peso na data_ajuste_peso.
      -- Projeção: peso_ajuste + gmd * (D - data_ajuste)
      UPDATE registros_suplementacao rs
      SET peso_vivo_kg = v_peso_atual + v_gmd * ((rs.data::date - v_data_ajuste)::integer),
          updated_at = NOW()
      WHERE rs.lote_id = p_lote_id
        AND rs.deleted_at IS NULL
        AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_atual + v_gmd * ((rs.data::date - v_data_ajuste)::integer));
    ELSE
      -- Cron ou outro trigger: peso_vivo_atual_kg_cab é o peso projetado para hoje.
      -- Projeção: peso_atual + gmd * (D - hoje)
      -- Equivalente a: peso_ajuste + gmd * (D - data_ajuste) quando o cron tem corrido.
      UPDATE registros_suplementacao rs
      SET peso_vivo_kg = v_peso_atual + v_gmd * ((rs.data::date - CURRENT_DATE)::integer),
          updated_at = NOW()
      WHERE rs.lote_id = p_lote_id
        AND rs.deleted_at IS NULL
        AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_atual + v_gmd * ((rs.data::date - CURRENT_DATE)::integer));
    END IF;

  -- Caso 2: sem data_ajuste_peso, usar peso_inicio + gmd * dias desde data_inicio
  ELSE
    IF v_peso_base IS NULL OR v_data_inicio IS NULL THEN
      RETURN;
    END IF;

    UPDATE registros_suplementacao rs
    SET peso_vivo_kg = v_peso_base + v_gmd * GREATEST((rs.data::date - v_data_inicio)::integer, 0),
        updated_at = NOW()
    WHERE rs.lote_id = p_lote_id
      AND rs.deleted_at IS NULL
      AND rs.peso_vivo_kg IS DISTINCT FROM (v_peso_base + v_gmd * GREATEST((rs.data::date - v_data_inicio)::integer, 0));
  END IF;
END;
$function$;

-- ============================================================
-- 2. Trigger em planos_nutricionais
-- ============================================================
-- Dispara quando data_inicio, gmd_planejado, peso_inicio_kg_cab ou formulacao_id
-- são inseridos ou alterados. O INSERT cobre o caso de plano novo com data_inicio
-- retroativo (registros pré-plano passam a ter projeção calculável).

CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_plano()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lote_id uuid;
BEGIN
  SELECT lc.lote_id INTO v_lote_id
  FROM lote_categorias lc
  WHERE lc.id = NEW.lote_categoria_id;

  IF v_lote_id IS NOT NULL THEN
    PERFORM recalcular_peso_vivo_lote(v_lote_id, false);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_peso_plano ON public.planos_nutricionais;
CREATE TRIGGER trigger_recalc_peso_plano
  AFTER INSERT OR UPDATE OF data_inicio, gmd_planejado, peso_inicio_kg_cab, formulacao_id
  ON public.planos_nutricionais
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_peso_plano();

-- ============================================================
-- 3. Trigger em lote_categorias
-- ============================================================
-- Dispara quando data_ajuste_peso, peso_vivo_atual_kg_cab ou peso_entrada_kg_cab
-- são alterados.
-- Se data_ajuste_peso mudou, é ajuste manual: peso_vivo_atual_kg_cab é o peso
-- na data_ajuste_peso, usar fórmula manual.
-- Se só peso_vivo_atual_kg_cab mudou, é o cron: usar fórmula CURRENT_DATE.
-- O cron produz os mesmos valores (no-op com IS DISTINCT FROM).

CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_lote_cat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Só recalcular se a categoria está ativa (sem data_fim)
  IF NEW.data_fim IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Se data_ajuste_peso mudou, é ajuste manual
  PERFORM recalcular_peso_vivo_lote(
    NEW.lote_id,
    NEW.data_ajuste_peso IS DISTINCT FROM OLD.data_ajuste_peso
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_peso_lote_cat ON public.lote_categorias;
CREATE TRIGGER trigger_recalc_peso_lote_cat
  AFTER UPDATE OF data_ajuste_peso, peso_vivo_atual_kg_cab, peso_entrada_kg_cab
  ON public.lote_categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_peso_lote_cat();

-- ============================================================
-- 4. Trigger em formulacoes
-- ============================================================
-- Dispara quando gmd é alterado. Só afeta lotes cujo plano ativo tem
-- gmd_planejado IS NULL (caso contrário, COALESCE usa gmd_planejado).

CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_formulacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lote_id uuid;
BEGIN
  FOR v_lote_id IN
    SELECT DISTINCT lc.lote_id
    FROM planos_nutricionais pn
    JOIN lote_categorias lc ON lc.id = pn.lote_categoria_id
      AND lc.ativo = true
      AND lc.data_fim IS NULL
    WHERE pn.formulacao_id = NEW.id
      AND pn.ativo = true
      AND pn.gmd_planejado IS NULL
  LOOP
    PERFORM recalcular_peso_vivo_lote(v_lote_id, false);
  END LOOP;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_peso_formulacao ON public.formulacoes;
CREATE TRIGGER trigger_recalc_peso_formulacao
  AFTER UPDATE OF gmd
  ON public.formulacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_peso_formulacao();
