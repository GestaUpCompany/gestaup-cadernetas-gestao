
-- ============================================================================
-- 1. Atualizar atualizar_estrategia_nutricional_individuo() para ler do plano vigente
-- ============================================================================
CREATE OR REPLACE FUNCTION public.atualizar_estrategia_nutricional_individuo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.lote_atual IS NULL OR NEW.categoria IS NULL THEN
    NEW.estrategia_nutricional_id := NULL;
    NEW.estrategia_nutricional_nome := NULL;
    NEW.estrategia_nutricional_tipo := NULL;
    NEW.gmd_kg_cab_dia := NULL;
    NEW.peso_meta_kg := NULL;
    RETURN NEW;
  END IF;

  SELECT
    f.id,
    f.nome,
    f.tipo,
    f.gmd,
    pn.peso_meta_kg
  INTO
    NEW.estrategia_nutricional_id,
    NEW.estrategia_nutricional_nome,
    NEW.estrategia_nutricional_tipo,
    NEW.gmd_kg_cab_dia,
    NEW.peso_meta_kg
  FROM public.lote_categorias lc
  JOIN public.planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
  JOIN public.formulacoes f ON f.id = pn.formulacao_id
  WHERE lc.lote_id = NEW.lote_atual
    AND LOWER(lc.categoria) = LOWER(NEW.categoria)
    AND (lc.ativo IS NULL OR lc.ativo = true)
  LIMIT 1;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 2. Atualizar propagar_estrategia_nutricional_para_individuos()
--    Agora disparada por mudanças em planos_nutricionais (ativo muda)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.propagar_estrategia_nutricional_para_individuos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lote_id uuid;
  v_categoria text;
  v_formulacao_id uuid;
  v_gmd numeric;
  v_nome text;
  v_tipo text;
  v_peso_meta numeric;
BEGIN
  -- Buscar lote_id e categoria a partir do lote_categorias
  SELECT lc.lote_id, lc.categoria INTO v_lote_id, v_categoria
  FROM lote_categorias lc
  WHERE lc.id = NEW.lote_categoria_id;

  -- Buscar dados da formulação
  SELECT f.id, f.nome, f.tipo, f.gmd, NEW.peso_meta_kg
  INTO v_formulacao_id, v_nome, v_tipo, v_gmd, v_peso_meta
  FROM formulacoes f
  WHERE f.id = NEW.formulacao_id;

  -- Se o plano está ativo, propagar para indivíduos
  IF NEW.ativo = true THEN
    UPDATE public.individuos i
    SET
      estrategia_nutricional_id = v_formulacao_id,
      estrategia_nutricional_nome = v_nome,
      estrategia_nutricional_tipo = v_tipo,
      gmd_kg_cab_dia = v_gmd,
      peso_meta_kg = v_peso_meta,
      updated_at = now()
    WHERE i.lote_atual = v_lote_id
      AND LOWER(i.categoria) = LOWER(v_categoria)
      AND i.deleted_at IS NULL;

  -- Se o plano foi desativado, limpar estratégia dos indivíduos
  ELSIF TG_OP = 'UPDATE' AND OLD.ativo = true AND NEW.ativo = false THEN
    UPDATE public.individuos i
    SET
      estrategia_nutricional_id = NULL,
      estrategia_nutricional_nome = NULL,
      estrategia_nutricional_tipo = NULL,
      gmd_kg_cab_dia = NULL,
      peso_meta_kg = NULL,
      updated_at = now()
    WHERE i.lote_atual = v_lote_id
      AND LOWER(i.categoria) = LOWER(v_categoria)
      AND i.deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 3. Remover trigger antigo de lote_categorias e criar novo em planos_nutricionais
-- ============================================================================
DROP TRIGGER IF EXISTS trg_lote_categorias_propagar_estrategia ON public.lote_categorias;

DROP TRIGGER IF EXISTS trg_planos_nutricionais_propagar_individuos ON public.planos_nutricionais;
CREATE TRIGGER trg_planos_nutricionais_propagar_individuos
AFTER INSERT OR UPDATE ON public.planos_nutricionais
FOR EACH ROW
EXECUTE FUNCTION public.propagar_estrategia_nutricional_para_individuos();
;
