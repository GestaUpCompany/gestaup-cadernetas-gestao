-- ============================================================================
-- MIGRATION J — Normalização de categorias (case + unicode)
-- ============================================================================
-- Objetivo: eliminar variações de capitalização e unicode escapado nas
-- colunas de categoria para que lookups, constraints únicas e matching
-- no frontend funcionem de forma determinística.
--
-- Forma canônica:
-- - lote_categorias.categoria        -> LOWER(TRIM(categoria))
-- - formulacao_categorias_gmd.categoria -> LOWER(TRIM(categoria))
-- - faixas_categorias.nome           -> Title Case com caractere real (não escape)
--
-- Problemas encontrados em produção:
-- 1. lote_categorias: "garrote" vs "Garrote", "boi magro" vs "Boi Magro", etc.
-- 2. formulacao_categorias_gmd: duplicatas após backfill (garrote + Garrote)
-- 3. faixas_categorias: "Bezerro ao Pé" vs "Bezerro ao P\u00e9" (unicode escapado)
-- 4. Outlier "73" em lote_categorias (dado corrompido)
--
-- Prevenção: triggers BEFORE INSERT/UPDATE normalizam automaticamente.
-- ============================================================================

-- ============================================================================
-- 1. Normalizar lote_categorias.categoria para LOWER(TRIM())
-- ============================================================================

-- 1a. Fix outlier "73" (dado corrompido sem significado de categoria)
UPDATE public.lote_categorias
SET categoria = NULL
WHERE categoria = '73';

-- 1b. Normalizar para lowercase + trim
UPDATE public.lote_categorias
SET categoria = LOWER(TRIM(categoria))
WHERE categoria IS NOT NULL
  AND categoria != LOWER(TRIM(categoria));

-- ============================================================================
-- 2. Normalizar formulacao_categorias_gmd.categoria e deduplicar
-- ============================================================================
-- Importante: a constraint UNIQUE (formulacao_id, categoria) é case-sensitive.
-- Se normalizarmos primeiro, "Garrote" -> "garrote" colide com "garrote" já
-- existente e viola a constraint. Portanto, deduplicamos primeiro removendo
-- as variações de case que colidem semanticamente, depois normalizamos.

-- 2a. Deduplicar antes da normalização: deletar a versão Title Case quando
--     já existe a versão lowercase para a mesma formulação. A linha lowercase
--     é sempre mantida; a Title Case é sempre deletada.
DELETE FROM public.formulacao_categorias_gmd a
USING public.formulacao_categorias_gmd b
WHERE a.formulacao_id = b.formulacao_id
  AND LOWER(TRIM(a.categoria)) = LOWER(TRIM(b.categoria))
  AND a.categoria != b.categoria
  AND a.categoria != LOWER(TRIM(a.categoria));

-- 2b. Deduplicar duplicatas restantes (mesmo case, mesma categoria)
--     mantendo GMD mais alto e id mais recente.
DELETE FROM public.formulacao_categorias_gmd a
USING public.formulacao_categorias_gmd b
WHERE a.formulacao_id = b.formulacao_id
  AND a.categoria = b.categoria
  AND (
    a.gmd < b.gmd
    OR (a.gmd = b.gmd AND a.id < b.id)
  );

-- 2c. Agora sim, normalizar para lowercase + trim (não há mais colisões)
UPDATE public.formulacao_categorias_gmd
SET categoria = LOWER(TRIM(categoria))
WHERE categoria != LOWER(TRIM(categoria));

-- ============================================================================
-- 3. Normalizar faixas_categorias.nome (corrigir unicode escapado)
-- ============================================================================
-- Manter Title Case (convenção de display), apenas corrigir o escape \u00e9 -> é

UPDATE public.faixas_categorias
SET nome = REPLACE(REPLACE(nome, 'P\u00e9', 'Pé'), 'p\u00e9', 'pé')
WHERE nome LIKE '%\u00e9%';

-- Deduplicar faixas_categorias que colidiram após correção de unicode
-- (Bezerra ao Pé vs Bezerra ao P\u00e9 para mesma fazenda + sexo)
DELETE FROM public.faixas_categorias a
USING public.faixas_categorias b
WHERE a.fazenda_id = b.fazenda_id
  AND a.nome = b.nome
  AND a.sexo = b.sexo
  AND a.id < b.id;

-- ============================================================================
-- 4. Triggers de prevenção: normalizar automaticamente em INSERT/UPDATE
-- ============================================================================

-- 4a. Função compartilhada para normalizar categoria em lowercase
CREATE OR REPLACE FUNCTION public.fn_normalize_categoria_lowercase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.categoria IS NOT NULL THEN
    NEW.categoria := LOWER(TRIM(NEW.categoria));
  END IF;
  RETURN NEW;
END;
$function$;

-- 4b. Trigger em lote_categorias
DROP TRIGGER IF EXISTS trg_normalize_categoria_lowercase ON public.lote_categorias;
CREATE TRIGGER trg_normalize_categoria_lowercase
  BEFORE INSERT OR UPDATE OF categoria ON public.lote_categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_normalize_categoria_lowercase();

-- 4c. Trigger em formulacao_categorias_gmd
DROP TRIGGER IF EXISTS trg_normalize_fcg_categoria ON public.formulacao_categorias_gmd;
CREATE TRIGGER trg_normalize_fcg_categoria
  BEFORE INSERT OR UPDATE OF categoria ON public.formulacao_categorias_gmd
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_normalize_categoria_lowercase();

-- 4d. Função para corrigir unicode escapado em faixas_categorias.nome
CREATE OR REPLACE FUNCTION public.fn_normalize_faixa_nome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.nome IS NOT NULL THEN
    NEW.nome := REPLACE(REPLACE(NEW.nome, 'P\u00e9', 'Pé'), 'p\u00e9', 'pé');
  END IF;
  RETURN NEW;
END;
$function$;

-- 4e. Trigger em faixas_categorias
DROP TRIGGER IF EXISTS trg_normalize_faixa_nome ON public.faixas_categorias;
CREATE TRIGGER trg_normalize_faixa_nome
  BEFORE INSERT OR UPDATE OF nome ON public.faixas_categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_normalize_faixa_nome();

-- ============================================================================
-- 5. Verificação pós-normalização (notices para log)
-- ============================================================================

DO $$
DECLARE
  v_dup_lote_cat INT;
  v_dup_fcg INT;
  v_dup_faixas INT;
  v_unicode_resid INT;
BEGIN
  SELECT COUNT(*) INTO v_dup_lote_cat
  FROM (
    SELECT lote_id, categoria, COUNT(*) AS c
    FROM public.lote_categorias
    WHERE ativo = true AND categoria IS NOT NULL
    GROUP BY lote_id, categoria
    HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_dup_fcg
  FROM (
    SELECT formulacao_id, categoria, COUNT(*) AS c
    FROM public.formulacao_categorias_gmd
    GROUP BY formulacao_id, categoria
    HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_dup_faixas
  FROM (
    SELECT fazenda_id, nome, sexo, COUNT(*) AS c
    FROM public.faixas_categorias
    GROUP BY fazenda_id, nome, sexo
    HAVING COUNT(*) > 1
  ) t;

  SELECT COUNT(*) INTO v_unicode_resid
  FROM public.faixas_categorias
  WHERE nome LIKE '%\u00e9%';

  RAISE NOTICE 'Pós-normalização: duplicatas lote_categorias=%, duplicatas fcg=%, duplicatas faixas=%, unicode residual=%',
    v_dup_lote_cat, v_dup_fcg, v_dup_faixas, v_unicode_resid;
END $$;
