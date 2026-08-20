-- ============================================================================
-- MIGRAÇÃO - Sync automático: texto de estratégia → FK e peso meta para indivíduos
-- ============================================================================

-- 1. Função para atualizar FK quando texto de estratégia muda
CREATE OR REPLACE FUNCTION public.sync_formulacao_id_por_texto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estrategia_nutricional IS DISTINCT FROM OLD.estrategia_nutricional THEN
    -- Buscar formulação por nome (case-insensitive, trim)
    SELECT id INTO NEW.formulacao_id
    FROM public.formulacoes f
    WHERE f.fazenda_id = (
      SELECT fazenda_id FROM public.lotes WHERE id = NEW.lote_id
    )
      AND LOWER(TRIM(f.nome)) = LOWER(TRIM(NEW.estrategia_nutricional))
      AND f.ativo = true
    LIMIT 1;
    
    -- Se não encontrou, limpa FK
    IF NEW.formulacao_id IS NULL THEN
      NEW.formulacao_id := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Trigger para sync de texto → FK
DROP TRIGGER IF EXISTS trg_lote_categorias_sync_formulacao_id ON public.lote_categorias;
CREATE TRIGGER trg_lote_categorias_sync_formulacao_id
BEFORE UPDATE ON public.lote_categorias
FOR EACH ROW
EXECUTE FUNCTION public.sync_formulacao_id_por_texto();

-- 3. Função para propagar peso meta para indivíduos
CREATE OR REPLACE FUNCTION public.propagar_peso_meta_para_individuos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.peso_vivo_meta_kg_cab IS DISTINCT FROM OLD.peso_vivo_meta_kg_cab OR
    NEW.formulacao_id IS DISTINCT FROM OLD.formulacao_id OR
    NEW.ativo IS DISTINCT FROM OLD.ativo
  ) THEN
    UPDATE public.individuos i
    SET
      estrategia_nutricional_id = COALESCE(NEW.formulacao_id, i.estrategia_nutricional_id),
      estrategia_nutricional_nome = COALESCE(f.nome, i.estrategia_nutricional_nome),
      estrategia_nutricional_tipo = COALESCE(f.tipo, i.estrategia_nutricional_tipo),
      gmd_kg_cab_dia = COALESCE(f.gmd, i.gmd_kg_cab_dia),
      peso_meta_kg = CASE 
        WHEN NEW.ativo = true AND NEW.peso_vivo_meta_kg_cab IS NOT NULL 
        THEN NEW.peso_vivo_meta_kg_cab 
        ELSE i.peso_meta_kg 
      END,
      updated_at = now()
    FROM public.formulacoes f
    WHERE i.lote_atual = NEW.lote_id
      AND LOWER(i.categoria) = LOWER(NEW.categoria)
      AND i.deleted_at IS NULL
      AND (NEW.formulacao_id IS NULL OR f.id = NEW.formulacao_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Substituir trigger antigo pelo novo
DROP TRIGGER IF EXISTS trg_lote_categorias_propagar_estrategia ON public.lote_categorias;
CREATE TRIGGER trg_lote_categorias_propagar_estrategia
AFTER UPDATE ON public.lote_categorias
FOR EACH ROW
EXECUTE FUNCTION public.propagar_peso_meta_para_individuos();

-- 5. Atualizar FKs em massa onde texto bate com formulação existente
UPDATE public.lote_categorias lc
SET formulacao_id = f.id
FROM public.formulacoes f
WHERE lc.formulacao_id IS NULL
  AND lc.estrategia_nutricional IS NOT NULL
  AND f.fazenda_id = (SELECT fazenda_id FROM public.lotes WHERE id = lc.lote_id)
  AND LOWER(TRIM(lc.estrategia_nutricional)) = LOWER(TRIM(f.nome))
  AND f.ativo = true;

-- 6. Atualizar peso_meta_kg em massa para indivíduos existentes
UPDATE public.individuos i
SET 
  peso_meta_kg = lc.peso_vivo_meta_kg_cab,
  estrategia_nutricional_id = lc.formulacao_id,
  estrategia_nutricional_nome = f.nome,
  estrategia_nutricional_tipo = f.tipo,
  gmd_kg_cab_dia = f.gmd,
  updated_at = now()
FROM public.lote_categorias lc
JOIN public.formulacoes f ON f.id = lc.formulacao_id
WHERE i.lote_atual = lc.lote_id
  AND LOWER(i.categoria) = LOWER(lc.categoria)
  AND lc.peso_vivo_meta_kg_cab IS NOT NULL
  AND lc.ativo = true
  AND i.deleted_at IS NULL;;
