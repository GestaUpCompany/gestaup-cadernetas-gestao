-- Migration: Trigger para recalcular consumo de registros_suplementacao
-- quando kg_cocho, n_cabecas, qtd_bezerros ou peso_vivo_kg são atualizados.
--
-- Problema: o trigger calcular_consumo_registro_anterior só dispara em INSERT.
-- Quando qualquer campo que afeta o cálculo de consumo é corrigido após o INSERT
-- (ex: bug do dobro de n_cabecas por categorias encerradas somadas, ou edição
-- do kg_cocho de um trato), o consumo_medio_geral_kg_mn fica desatualizado.
--
-- Solução: trigger AFTER UPDATE OF kg_cocho, n_cabecas, qtd_bezerros, peso_vivo_kg
-- que recalcula:
-- 1. SEMPRE: o consumo do próprio registro (NEW), usando o próximo registro
--    da série para determinar o intervalo. Necessário porque kg_cocho,
--    n_cabecas, qtd_bezerros e peso_vivo_kg todos afetam o cálculo do próprio.
-- 2. SÓ se n_cabecas, qtd_bezerros ou peso_vivo_kg mudaram (não kg_cocho):
--    o consumo do registro anterior. O consumo do anterior é
--    anterior.kg_cocho / (NEW.data - anterior.data) / anterior.cabecas,
--    que não depende do kg_cocho de NEW, mas pode precisar reprocessar
--    se o n_cabecas do anterior também estava errado (o UPDATE em cascata
--    do PWA corrige vários registros de uma vez).
--
-- A série é por lote_id apenas, independente da formulação:
-- o intervalo real entre tratos não depende do produto usado.
--
-- A fórmula replica calcular_consumo_registro_anterior:
--   consumo_kg_mn = kg_cocho / dias / (n_cabecas - qtd_bezerros)
--   consumo_kg_ms = consumo_kg_mn * teor_ms_dieta / 100
--   consumo_pct_pv = consumo_kg_ms / peso_vivo_kg * 100
--   custo = custo_mn_tonelada * consumo_kg_mn / 1000

CREATE OR REPLACE FUNCTION public.recalc_consumo_on_cabecas_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_prox RECORD;
  v_prev RECORD;
  v_dias INTEGER;
  v_animais_elegiveis INTEGER;
  v_consumo_kg_mn NUMERIC;
  v_consumo_kg_ms NUMERIC;
  v_consumo_pct_pv NUMERIC;
  v_custo_medio NUMERIC;
  v_teor_ms NUMERIC;
  v_custo_mn_tonelada NUMERIC;
  v_mudou_cabecas BOOLEAN;
BEGIN
  -- Determinar se cabeças/peso mudaram (passo 2 só roda nesses casos)
  v_mudou_cabecas := NEW.n_cabecas IS DISTINCT FROM OLD.n_cabecas
     OR NEW.qtd_bezerros IS DISTINCT FROM OLD.qtd_bezerros
     OR NEW.peso_vivo_kg IS DISTINCT FROM OLD.peso_vivo_kg;

  -- Se nada mudou (impossível em princípio, guarda de segurança)
  IF NOT v_mudou_cabecas
     AND NEW.kg_cocho IS NOT DISTINCT FROM OLD.kg_cocho THEN
    RETURN NEW;
  END IF;

  IF NEW.lote_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ============================================================
  -- 1. Recalcular consumo do próprio registro (NEW)
  --    usando o próximo registro da série para determinar o intervalo.
  --    Roda sempre, porque kg_cocho, n_cabecas, qtd_bezerros e peso_vivo_kg
  --    todos afetam o consumo do próprio registro.
  -- ============================================================
  SELECT id, data INTO v_prox
  FROM registros_suplementacao
  WHERE lote_id = NEW.lote_id
    AND deleted_at IS NULL
    AND id != NEW.id
    AND data > NEW.data
  ORDER BY data ASC, created_at ASC
  LIMIT 1;

  IF FOUND AND NEW.kg_cocho IS NOT NULL AND NEW.kg_cocho > 0 THEN
    v_animais_elegiveis := COALESCE(NEW.n_cabecas, 0) - COALESCE(NEW.qtd_bezerros, 0);

    IF v_animais_elegiveis > 0 THEN
      v_dias := GREATEST(
        ((v_prox.data AT TIME ZONE 'America/Cuiaba')::date - (NEW.data AT TIME ZONE 'America/Cuiaba')::date),
        1
      );

      v_consumo_kg_mn := NEW.kg_cocho / v_dias / v_animais_elegiveis;

      SELECT f.teor_ms_dieta, f.custo_mn_tonelada
      INTO v_teor_ms, v_custo_mn_tonelada
      FROM formulacoes f
      WHERE f.fazenda_id = NEW.fazenda_id
        AND f.nome = NEW.formulacao
        AND f.ativo = true
      LIMIT 1;

      IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
        v_consumo_kg_ms := v_consumo_kg_mn * (v_teor_ms / 100);
      ELSE
        v_consumo_kg_ms := NULL;
      END IF;

      IF v_consumo_kg_ms IS NOT NULL AND NEW.peso_vivo_kg IS NOT NULL AND NEW.peso_vivo_kg > 0 THEN
        v_consumo_pct_pv := (v_consumo_kg_ms / NEW.peso_vivo_kg) * 100;
      ELSE
        v_consumo_pct_pv := NULL;
      END IF;

      IF v_custo_mn_tonelada IS NOT NULL AND v_consumo_kg_mn IS NOT NULL THEN
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
      WHERE id = NEW.id;
    END IF;
  END IF;

  -- ============================================================
  -- 2. Recalcular consumo do registro anterior
  --    Só roda se n_cabecas, qtd_bezerros ou peso_vivo_kg mudaram.
  --    Não roda se apenas kg_cocho mudou, porque o consumo do anterior
  --    é anterior.kg_cocho / intervalo / anterior.cabecas, que não
  --    depende do kg_cocho de NEW.
  --    A série é por lote_id apenas, independente da formulação.
  -- ============================================================
  IF v_mudou_cabecas THEN
    SELECT id, data, kg_cocho, n_cabecas, qtd_bezerros, peso_vivo_kg, formulacao
    INTO v_prev
    FROM registros_suplementacao
    WHERE lote_id = NEW.lote_id
      AND deleted_at IS NULL
      AND id != NEW.id
      AND data <= NEW.data
    ORDER BY data DESC, created_at DESC
    LIMIT 1;

    IF FOUND AND v_prev.kg_cocho IS NOT NULL AND v_prev.kg_cocho > 0 THEN
      v_animais_elegiveis := COALESCE(v_prev.n_cabecas, 0) - COALESCE(v_prev.qtd_bezerros, 0);

      IF v_animais_elegiveis > 0 THEN
        v_dias := GREATEST(
          ((NEW.data AT TIME ZONE 'America/Cuiaba')::date - (v_prev.data AT TIME ZONE 'America/Cuiaba')::date),
          1
        );

        v_consumo_kg_mn := v_prev.kg_cocho / v_dias / v_animais_elegiveis;

        SELECT f.teor_ms_dieta, f.custo_mn_tonelada
        INTO v_teor_ms, v_custo_mn_tonelada
        FROM formulacoes f
        WHERE f.fazenda_id = NEW.fazenda_id
          AND f.nome = v_prev.formulacao
          AND f.ativo = true
        LIMIT 1;

        IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
          v_consumo_kg_ms := v_consumo_kg_mn * (v_teor_ms / 100);
        ELSE
          v_consumo_kg_ms := NULL;
        END IF;

        IF v_consumo_kg_ms IS NOT NULL AND v_prev.peso_vivo_kg IS NOT NULL AND v_prev.peso_vivo_kg > 0 THEN
          v_consumo_pct_pv := (v_consumo_kg_ms / v_prev.peso_vivo_kg) * 100;
        ELSE
          v_consumo_pct_pv := NULL;
        END IF;

        IF v_custo_mn_tonelada IS NOT NULL AND v_consumo_kg_mn IS NOT NULL THEN
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
        WHERE id = v_prev.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_recalc_consumo_on_cabecas_update ON public.registros_suplementacao;
CREATE TRIGGER trigger_recalc_consumo_on_cabecas_update
  AFTER UPDATE OF kg_cocho, n_cabecas, qtd_bezerros, peso_vivo_kg
  ON public.registros_suplementacao
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_consumo_on_cabecas_update();
