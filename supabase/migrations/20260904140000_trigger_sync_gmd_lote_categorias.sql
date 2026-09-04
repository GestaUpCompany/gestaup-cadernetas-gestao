-- ============================================================================
-- MIGRAÇÃO — Trigger para re-sincronizar lote_categorias.gmd quando
--            formulacao_categorias_gmd é inserida ou atualizada
-- ============================================================================
-- Problema: quando um GMD por categoria é adicionado ou alterado em
-- formulacao_categorias_gmd, as lote_categorias ativas que usam aquela
-- formulação no plano vigente não são atualizadas. O cron de evolução
-- de peso lê lote_categorias.gmd diretamente, então categorias com
-- gmd = null não evoluem peso, mesmo que a formulação já tenha o GMD.
--
-- Solução: trigger AFTER INSERT/UPDATE que sincroniza lote_categorias.gmd
-- para categorias ativas cujo plano vigente usa a formulação afetada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_gmd_lote_categorias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.lote_categorias lc
  SET gmd = NEW.gmd::text
  FROM public.planos_nutricionais pn
  WHERE pn.formulacao_id = NEW.formulacao_id
    AND pn.ativo = true
    AND pn.data_fim IS NULL
    AND lc.lote_id = pn.lote_id
    AND lc.ativo = true
    AND lc.data_fim IS NULL
    AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(NEW.categoria));
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_gmd_lote_categorias ON public.formulacao_categorias_gmd;

CREATE TRIGGER trg_sync_gmd_lote_categorias
  AFTER INSERT OR UPDATE ON public.formulacao_categorias_gmd
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gmd_lote_categorias();
