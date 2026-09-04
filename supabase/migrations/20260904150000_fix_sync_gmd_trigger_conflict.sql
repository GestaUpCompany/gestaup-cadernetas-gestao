-- ============================================================================
-- MIGRAÇÃO — Corrige conflito de nomes entre triggers de GMD
-- ============================================================================
-- Problema: a migration 20260904140000 fez CREATE OR REPLACE FUNCTION
-- sync_gmd_lote_categorias() esperando NEW.categoria (campo de
-- formulacao_categorias_gmd), mas a trigger trg_lotes_sync_gmd_categorias
-- na tabela lotes chama essa mesma função. lotes não tem campo categoria,
-- causando "record NEW has no field categoria" ao inserir/atualizar lotes.
--
-- Solução:
-- 1. Restaurar sync_gmd_lote_categorias() para a versão da Migration Z7
--    (que opera sobre lotes: NEW.formulacao_id, NEW.destino, NEW.id)
-- 2. Criar função nova sync_gmd_from_formulacao_categorias() para a
--    trigger em formulacao_categorias_gmd (usa NEW.formulacao_id, NEW.categoria)
-- ============================================================================

-- 1. Restaurar sync_gmd_lote_categorias para a versão da Migration Z7
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

-- 2. Criar função nova para a trigger em formulacao_categorias_gmd
CREATE OR REPLACE FUNCTION public.sync_gmd_from_formulacao_categorias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.lote_categorias lc
  SET gmd = CASE
    WHEN l.destino = 'enfermaria' THEN (NEW.gmd * 0.5)::text
    ELSE NEW.gmd::text
  END
  FROM public.planos_nutricionais pn, public.lotes l
  WHERE pn.formulacao_id = NEW.formulacao_id
    AND pn.ativo = true
    AND pn.data_fim IS NULL
    AND lc.lote_id = pn.lote_id
    AND l.id = lc.lote_id
    AND lc.ativo = true
    AND lc.data_fim IS NULL
    AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(NEW.categoria));
  RETURN NEW;
END;
$function$;

-- 3. Recriar trigger em formulacao_categorias_gmd com a função nova
DROP TRIGGER IF EXISTS trg_sync_gmd_lote_categorias ON public.formulacao_categorias_gmd;

CREATE TRIGGER trg_sync_gmd_lote_categorias
  AFTER INSERT OR UPDATE ON public.formulacao_categorias_gmd
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gmd_from_formulacao_categorias();
