-- ============================================================================
-- Migration: recalcular_peso_vivo_lote com média ponderada de todas as categorias
-- Data: 2026-08-21
-- Bug: recalcular_peso_vivo_lote usava LIMIT 1 e join por lote_categoria_id,
--      considerando apenas uma categoria do lote no cálculo de peso_vivo_kg.
--      Categorias sem plano ativo (lote_categoria_id sem plano) eram ignoradas.
-- Correção: buscar plano por lote_id, iterar todas as categorias ativas,
--           calcular média ponderada por quant_atual.
-- ============================================================================

-- ============================================================================
-- 1. Reescrever recalcular_peso_vivo_lote(uuid, boolean)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalcular_peso_vivo_lote(
  p_lote_id uuid,
  p_ajuste_manual boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_plano_id uuid;
  v_data_inicio date;
  v_formulacao_id uuid;
  reg RECORD;
  cat RECORD;
  v_total_peso numeric;
  v_total_cabecas integer;
  v_cat_peso numeric;
  v_cat_gmd numeric;
  v_cat_peso_inicio numeric;
  v_dias integer;
  v_peso_ponderado numeric;
BEGIN
  -- Buscar plano ativo por lote_id (não por lote_categoria_id)
  SELECT id, data_inicio, formulacao_id
  INTO v_plano_id, v_data_inicio, v_formulacao_id
  FROM planos_nutricionais
  WHERE lote_id = p_lote_id
    AND ativo = true
    AND data_fim IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Para cada registro do lote, recalcular peso_vivo_kg
  FOR reg IN
    SELECT id, (data AT TIME ZONE 'America/Cuiaba')::date AS data_reg
    FROM registros_suplementacao
    WHERE lote_id = p_lote_id
      AND deleted_at IS NULL
  LOOP
    v_total_peso := 0;
    v_total_cabecas := 0;

    -- Iterar sobre todas as categorias ativas do lote
    FOR cat IN
      SELECT
        lc.id,
        lc.categoria,
        lc.quant_atual,
        lc.peso_vivo_atual_kg_cab,
        lc.data_ajuste_peso,
        COALESCE(pcp.peso_inicio_kg_cab, lc.peso_entrada_kg_cab) AS peso_inicio_cat,
        fcg.gmd AS gmd_cat
      FROM lote_categorias lc
      LEFT JOIN plano_categoria_personalizacao pcp
        ON pcp.plano_id = v_plano_id
        AND pcp.lote_categoria_id = lc.id
        AND pcp.ativo = true
      LEFT JOIN formulacao_categorias_gmd fcg
        ON fcg.formulacao_id = v_formulacao_id
        AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(lc.categoria))
      WHERE lc.lote_id = p_lote_id
        AND lc.ativo = true
        AND lc.data_fim IS NULL
        AND lc.quant_atual > 0
    LOOP
      -- Calcular peso projetado da categoria para a data do registro
      IF cat.data_ajuste_peso IS NOT NULL AND cat.peso_vivo_atual_kg_cab IS NOT NULL AND cat.gmd_cat IS NOT NULL THEN
        -- Categoria com ajuste manual: projetar a partir do peso atual
        IF p_ajuste_manual THEN
          v_dias := (reg.data_reg - cat.data_ajuste_peso)::integer;
        ELSE
          v_dias := (reg.data_reg - CURRENT_DATE)::integer;
        END IF;
        v_cat_peso := cat.peso_vivo_atual_kg_cab + cat.gmd_cat * v_dias;
      ELSIF cat.peso_inicio_cat IS NOT NULL AND v_data_inicio IS NOT NULL AND cat.gmd_cat IS NOT NULL THEN
        -- Categoria com GMD: projetar a partir de peso_inicio + GMD × dias
        v_dias := GREATEST((reg.data_reg - v_data_inicio)::integer, 0);
        v_cat_peso := cat.peso_inicio_cat + cat.gmd_cat * v_dias;
      ELSE
        -- Categoria sem GMD ou sem dados: usar peso atual estático (sem projeção)
        v_cat_peso := COALESCE(cat.peso_vivo_atual_kg_cab, cat.peso_inicio_cat, 0);
      END IF;

      v_total_peso := v_total_peso + (v_cat_peso * cat.quant_atual);
      v_total_cabecas := v_total_cabecas + cat.quant_atual;
    END LOOP;

    -- Calcular média ponderada e atualizar o registro
    IF v_total_cabecas > 0 THEN
      v_peso_ponderado := v_total_peso / v_total_cabecas;

      UPDATE registros_suplementacao
      SET peso_vivo_kg = ROUND(v_peso_ponderado, 2),
          updated_at = NOW()
      WHERE id = reg.id
        AND peso_vivo_kg IS DISTINCT FROM ROUND(v_peso_ponderado, 2);
    END IF;
  END LOOP;
END;
$function$;

-- ============================================================================
-- 2. Remover overload antigo recalcular_peso_vivo_lote(uuid)
-- ============================================================================

DROP FUNCTION IF EXISTS public.recalcular_peso_vivo_lote(uuid);

-- ============================================================================
-- 3. Trigger on INSERT em registros_suplementacao
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.lote_id IS NOT NULL THEN
    PERFORM recalcular_peso_vivo_lote(NEW.lote_id, false);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_peso_on_insert ON public.registros_suplementacao;

CREATE TRIGGER trigger_recalc_peso_on_insert
AFTER INSERT ON public.registros_suplementacao
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_peso_on_insert();

-- ============================================================================
-- 4. Recalcular passivo: todos os lotes com registros e plano ativo
-- ============================================================================

DO $$
DECLARE
  lote_row RECORD;
BEGIN
  FOR lote_row IN
    SELECT DISTINCT rs.lote_id
    FROM registros_suplementacao rs
    WHERE rs.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM planos_nutricionais pn
        WHERE pn.lote_id = rs.lote_id
          AND pn.ativo = true
          AND pn.data_fim IS NULL
      )
  LOOP
    PERFORM recalcular_peso_vivo_lote(lote_row.lote_id, false);
  END LOOP;
END $$;
