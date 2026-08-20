-- ============================================================================
-- MIGRATION F — Bezerros ao pé com GMD padrão
-- ============================================================================
-- Objetivo: bezerros ao pé (Bezerro ao Pé / Bezerra ao Pé) iniciam evolução
-- com GMD padrão (0.600 / 0.500 kg/dia) ao entrarem em um lote, sem precisar
-- de plano nutricional. O cron (Migration E) já lê lc.gmd diretamente.
--
-- Regras:
-- - Bezerro ao Pé: GMD padrão 0.600
-- - Bezerra ao Pé: GMD padrão 0.500
-- - Essas categorias não entram na lista de formulações (Formulacoes.tsx)
-- - Não acessam o modal de planos nutricionais
-- - GMD é editável em local separado em Lotes.tsx (update direto em
--   lote_categorias.gmd)
-- - Evoluem até atingirem a faixa de recategorização; só após recategorizados
--   podem receber planos nutricionais normais
-- ============================================================================

-- 1. Função da trigger: setar GMD padrão no INSERT de bezerros ao pé
CREATE OR REPLACE FUNCTION public.fn_set_gmd_bezerro_ao_pe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF LOWER(TRIM(NEW.categoria)) IN ('bezerro ao pé', 'bezerro ao pe') THEN
      NEW.gmd := '0.600';
    ELSIF LOWER(TRIM(NEW.categoria)) IN ('bezerra ao pé', 'bezerra ao pe') THEN
      NEW.gmd := '0.500';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Trigger BEFORE INSERT em lote_categorias
DROP TRIGGER IF EXISTS trg_set_gmd_bezerro_ao_pe ON public.lote_categorias;
CREATE TRIGGER trg_set_gmd_bezerro_ao_pe
  BEFORE INSERT ON public.lote_categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_gmd_bezerro_ao_pe();

-- 3. Backfill: bezerros ao pé existentes sem GMD
UPDATE public.lote_categorias
SET gmd = CASE
  WHEN LOWER(TRIM(categoria)) IN ('bezerro ao pé', 'bezerro ao pe') THEN '0.600'
  WHEN LOWER(TRIM(categoria)) IN ('bezerra ao pé', 'bezerra ao pe') THEN '0.500'
END
WHERE ativo = true
  AND data_fim IS NULL
  AND (gmd IS NULL OR gmd = '')
  AND LOWER(TRIM(categoria)) IN (
    'bezerro ao pé', 'bezerro ao pe',
    'bezerra ao pé', 'bezerra ao pe'
  );
