-- ============================================================================
-- MIGRATION Z7 — GMD reduzido em 50% para lotes de enfermaria
-- ============================================================================
-- Em lotes com destino = 'enfermaria', o GMD de todas as categorias ativas
-- (exceto bezerro ao pé e bezerra ao pé, que têm GMD próprio) recebe 50% de
-- desconto sobre o valor original da formulação.
--
-- Ex: formulação com boi magro GMD 0,800 → na enfermaria o lote usa GMD 0,400.
--
-- A fonte de verdade continua sendo formulacao_categorias_gmd. O valor
-- descontado é apenas o cache em lote_categorias.gmd, recalculado a cada
-- sincronização. Ao trocar destino de volta para corte/reprodução, o GMD
-- volta ao valor original.
--
-- Bezerro ao pé e bezerra ao pé ficam de fora: GMD deles é fixo (0.600 e
-- 0.500), não vem de formulacao_categorias_gmd.
-- ============================================================================

-- 1. Estender sync_gmd_lote_categorias: aplicar 50% quando destino = enfermaria
--    e disparar também quando destino mudar (não só formulacao_id)
CREATE OR REPLACE FUNCTION public.sync_gmd_lote_categorias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
BEGIN
  IF NEW.formulacao_id IS DISTINCT FROM OLD.formulacao_id
     OR NEW.destino IS DISTINCT FROM OLD.destino
     OR TG_OP = 'INSERT' THEN

    -- Limpa GMD de categorias que nao estao na nova formulacao
    -- (exceto bezerros ao pe, que tem GMD proprio)
    UPDATE public.lote_categorias lc
      SET gmd = NULL
      WHERE lc.lote_id = NEW.id
        AND lc.ativo = true
        AND lc.data_fim IS NULL
        AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerro ao pe'
        AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerra ao pe'
        AND NOT EXISTS (
          SELECT 1 FROM public.formulacao_categorias_gmd fcg
          WHERE fcg.formulacao_id = NEW.formulacao_id
            AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(lc.categoria))
        );

    -- Seta GMD das categorias que estao na formulacao
    -- Aplica 50% de desconto se o lote for enfermaria
    UPDATE public.lote_categorias lc
      SET gmd = CASE
        WHEN NEW.destino = 'enfermaria' THEN (fcg.gmd * 0.5)::text
        ELSE fcg.gmd::text
      END
      FROM public.formulacao_categorias_gmd fcg
      WHERE lc.lote_id = NEW.id
        AND lc.ativo = true
        AND lc.data_fim IS NULL
        AND fcg.formulacao_id = NEW.formulacao_id
        AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria));
  END IF;
  RETURN NEW;
END;
$func$;

-- 2. Estender repropagar_gmd_para_lotes: aplicar 50% quando lote for enfermaria
CREATE OR REPLACE FUNCTION public.repropagar_gmd_para_lotes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_form_id uuid;
BEGIN
  v_form_id := COALESCE(NEW.formulacao_id, OLD.formulacao_id);

  IF v_form_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Seta GMD aplicando 50% se o lote for enfermaria
  UPDATE public.lote_categorias lc
    SET gmd = CASE
      WHEN l.destino = 'enfermaria' THEN (fcg.gmd * 0.5)::text
      ELSE fcg.gmd::text
    END
    FROM public.formulacao_categorias_gmd fcg, public.lotes l
    WHERE lc.ativo = true
      AND lc.data_fim IS NULL
      AND fcg.formulacao_id = v_form_id
      AND l.id = lc.lote_id
      AND l.formulacao_id = v_form_id
      AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria));

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
        AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerro ao pe'
        AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerra ao pe';
  END IF;

  RETURN NULL;
END;
$func$;

-- 3. Recriar trigger para disparar também em UPDATE OF destino
DROP TRIGGER IF EXISTS trg_lotes_sync_gmd_categorias ON public.lotes;
CREATE TRIGGER trg_lotes_sync_gmd_categorias
  AFTER INSERT OR UPDATE OF formulacao_id, destino ON public.lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gmd_lote_categorias();

-- 4. Backfill: aplicar desconto a lotes de enfermaria já existentes
UPDATE public.lote_categorias lc
  SET gmd = (fcg.gmd * 0.5)::text
  FROM public.formulacao_categorias_gmd fcg, public.lotes l
  WHERE lc.ativo = true
    AND lc.data_fim IS NULL
    AND l.id = lc.lote_id
    AND l.destino = 'enfermaria'
    AND l.formulacao_id = fcg.formulacao_id
    AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria))
    AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerro ao pe'
    AND LOWER(unaccent(lc.categoria)) NOT ILIKE 'bezerra ao pe';
