-- ============================================================================
-- MIGRATION D — Sincronização lotes.formulacao_id → lote_categorias.gmd
-- ============================================================================
-- Objetivo: quando lotes.formulacao_id muda, ou quando o GMD por categoria da
-- formulação muda, o lote_categorias.gmd é atualizado via match contra
-- formulacao_categorias_gmd.
--
-- Esta trigger é a fonte principal de GMD para lote_categorias na nova
-- arquitetura. O cron (Migration E) lê lote_categorias.gmd diretamente.
--
-- Categorias que não estão na formulação têm gmd setado para NULL (param de
-- evoluir peso), exceto bezerros ao pé que têm GMD próprio (Migration F).
-- ============================================================================

-- 1. Função: sincronizar GMD quando lotes.formulacao_id muda
CREATE OR REPLACE FUNCTION public.sync_gmd_lote_categorias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.formulacao_id IS DISTINCT FROM OLD.formulacao_id OR TG_OP = 'INSERT' THEN
    -- Limpa GMD de categorias que não estão na nova formulação
    -- (exceto bezerros ao pé, que têm GMD próprio)
    UPDATE public.lote_categorias lc
      SET gmd = NULL
      WHERE lc.lote_id = NEW.id
        AND lc.ativo = true
        AND lc.data_fim IS NULL
        AND LOWER(TRIM(lc.categoria)) NOT IN (
          'bezerro ao pé', 'bezerro ao pe',
          'bezerra ao pé', 'bezerra ao pe'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.formulacao_categorias_gmd fcg
          WHERE fcg.formulacao_id = NEW.formulacao_id
            AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(lc.categoria))
        );

    -- Seta GMD das categorias que estão na formulação
    UPDATE public.lote_categorias lc
      SET gmd = fcg.gmd::text
      FROM public.formulacao_categorias_gmd fcg
      WHERE lc.lote_id = NEW.id
        AND lc.ativo = true
        AND lc.data_fim IS NULL
        AND fcg.formulacao_id = NEW.formulacao_id
        AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria));
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Trigger em lotes (AFTER INSERT OR UPDATE OF formulacao_id)
DROP TRIGGER IF EXISTS trg_lotes_sync_gmd_categorias ON public.lotes;
CREATE TRIGGER trg_lotes_sync_gmd_categorias
  AFTER INSERT OR UPDATE OF formulacao_id ON public.lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gmd_lote_categorias();

-- 3. Função: repropagar GMD quando formulacao_categorias_gmd muda
CREATE OR REPLACE FUNCTION public.repropagar_gmd_para_lotes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_form_id uuid;
BEGIN
  v_form_id := COALESCE(NEW.formulacao_id, OLD.formulacao_id);

  IF v_form_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Atualiza lote_categorias.gmd para todos os lotes que usam esta formulação
  -- e têm categoria correspondente
  UPDATE public.lote_categorias lc
    SET gmd = fcg.gmd::text
    FROM public.formulacao_categorias_gmd fcg
    WHERE lc.ativo = true
      AND lc.data_fim IS NULL
      AND fcg.formulacao_id = v_form_id
      AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria))
      AND EXISTS (
        SELECT 1 FROM public.lotes l
        WHERE l.id = lc.lote_id
          AND l.formulacao_id = v_form_id
      );

  -- Se DELETE, limpa GMD das categorias que correspondiam à entrada removida
  IF TG_OP = 'DELETE' THEN
    UPDATE public.lote_categorias lc
      SET gmd = NULL
      WHERE lc.ativo = true
        AND lc.data_fim IS NULL
        AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(OLD.categoria))
        AND EXISTS (
          SELECT 1 FROM public.lotes l
          WHERE l.id = lc.lote_id
            AND l.formulacao_id = v_form_id
        )
        AND LOWER(TRIM(lc.categoria)) NOT IN (
          'bezerro ao pé', 'bezerro ao pe',
          'bezerra ao pé', 'bezerra ao pe'
        );
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Trigger em formulacao_categorias_gmd (AFTER INSERT/UPDATE/DELETE)
DROP TRIGGER IF EXISTS trg_formulacao_categorias_gmd_repropaga ON public.formulacao_categorias_gmd;
CREATE TRIGGER trg_formulacao_categorias_gmd_repropaga
  AFTER INSERT OR UPDATE OF gmd OR DELETE ON public.formulacao_categorias_gmd
  FOR EACH ROW
  EXECUTE FUNCTION public.repropagar_gmd_para_lotes();
