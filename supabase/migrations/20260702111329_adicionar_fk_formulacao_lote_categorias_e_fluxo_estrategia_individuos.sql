-- ============================================================================
-- MIGRAÇÃO - FK de formulação em lote_categorias e fluxo automático de estratégia
-- ============================================================================
-- 1. Adicionar formulacao_id em lote_categorias
-- 2. Migrar estrategia_nutricional (texto) para formulacao_id
-- 3. Adicionar FK para formulacoes
-- 4. Criar função/trigger para atualizar estratégia do indivíduo automaticamente
-- ============================================================================

-- 1. Adicionar coluna formulacao_id
ALTER TABLE public.lote_categorias
ADD COLUMN IF NOT EXISTS formulacao_id uuid;

-- 2. Migrar dados existentes por match de nome (ignora case/whitespace)
UPDATE public.lote_categorias lc
SET formulacao_id = f.id
FROM public.formulacoes f
WHERE LOWER(TRIM(lc.estrategia_nutricional)) = LOWER(TRIM(f.nome));

-- 3. Adicionar FK (ON DELETE SET NULL para não quebrar se exclusão)
ALTER TABLE public.lote_categorias
DROP CONSTRAINT IF EXISTS lote_categorias_formulacao_id_fkey;

ALTER TABLE public.lote_categorias
ADD CONSTRAINT lote_categorias_formulacao_id_fkey
FOREIGN KEY (formulacao_id)
REFERENCES public.formulacoes(id)
ON DELETE SET NULL;

-- 4. Função para atualizar estratégia do indivíduo baseado no lote + categoria
CREATE OR REPLACE FUNCTION public.atualizar_estrategia_nutricional_individuo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lote_atual IS NULL OR NEW.categoria IS NULL THEN
    NEW.estrategia_nutricional_id := NULL;
    NEW.estrategia_nutricional_nome := NULL;
    NEW.estrategia_nutricional_tipo := NULL;
    NEW.gmd_kg_cab_dia := NULL;
    RETURN NEW;
  END IF;

  SELECT
    f.id,
    f.nome,
    f.tipo,
    f.gmd
  INTO
    NEW.estrategia_nutricional_id,
    NEW.estrategia_nutricional_nome,
    NEW.estrategia_nutricional_tipo,
    NEW.gmd_kg_cab_dia
  FROM public.lote_categorias lc
  JOIN public.formulacoes f ON f.id = lc.formulacao_id
  WHERE lc.lote_id = NEW.lote_atual
    AND LOWER(lc.categoria) = LOWER(NEW.categoria)
    AND (lc.ativo IS NULL OR lc.ativo = true)
  LIMIT 1;

  RETURN NEW;
END;
$$;

-- 5. Trigger em individuos para atualizar estratégia automaticamente
DROP TRIGGER IF EXISTS trg_individuos_atualizar_estrategia_nutricional ON public.individuos;
CREATE TRIGGER trg_individuos_atualizar_estrategia_nutricional
BEFORE INSERT OR UPDATE OF lote_atual, categoria ON public.individuos
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_estrategia_nutricional_individuo();

-- 6. Função para propagar mudanças de lote_categorias para indivíduos afetados
CREATE OR REPLACE FUNCTION public.propagar_estrategia_nutricional_para_individuos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.formulacao_id IS DISTINCT FROM OLD.formulacao_id OR
    NEW.ativo IS DISTINCT FROM OLD.ativo
  ) THEN
    UPDATE public.individuos i
    SET
      estrategia_nutricional_id = f.id,
      estrategia_nutricional_nome = f.nome,
      estrategia_nutricional_tipo = f.tipo,
      gmd_kg_cab_dia = f.gmd,
      updated_at = now()
    FROM public.formulacoes f
    WHERE i.lote_atual = NEW.lote_id
      AND LOWER(i.categoria) = LOWER(NEW.categoria)
      AND i.deleted_at IS NULL
      AND f.id = NEW.formulacao_id;

    -- Se a formulação foi removida ou inativada, limpa estratégia dos indivíduos afetados
    IF NEW.formulacao_id IS NULL OR NEW.ativo = false THEN
      UPDATE public.individuos i
      SET
        estrategia_nutricional_id = NULL,
        estrategia_nutricional_nome = NULL,
        estrategia_nutricional_tipo = NULL,
        gmd_kg_cab_dia = NULL,
        updated_at = now()
      WHERE i.lote_atual = NEW.lote_id
        AND LOWER(i.categoria) = LOWER(NEW.categoria)
        AND i.deleted_at IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Trigger em lote_categorias para propagar alterações
DROP TRIGGER IF EXISTS trg_lote_categorias_propagar_estrategia ON public.lote_categorias;
CREATE TRIGGER trg_lote_categorias_propagar_estrategia
AFTER UPDATE ON public.lote_categorias
FOR EACH ROW
EXECUTE FUNCTION public.propagar_estrategia_nutricional_para_individuos();

-- 8. Atualizar indivíduos existentes
UPDATE public.individuos i
SET
  estrategia_nutricional_id = f.id,
  estrategia_nutricional_nome = f.nome,
  estrategia_nutricional_tipo = f.tipo,
  gmd_kg_cab_dia = f.gmd,
  updated_at = now()
FROM public.lote_categorias lc
JOIN public.formulacoes f ON f.id = lc.formulacao_id
WHERE i.lote_atual = lc.lote_id
  AND LOWER(i.categoria) = LOWER(lc.categoria)
  AND (lc.ativo IS NULL OR lc.ativo = true)
  AND i.deleted_at IS NULL;
;
