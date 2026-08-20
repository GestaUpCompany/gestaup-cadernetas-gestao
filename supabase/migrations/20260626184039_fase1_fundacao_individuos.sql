
-- ============================================================================
-- FASE 1 - Fundação e Banco de Dados para Gestão de Indivíduos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Remover CHECK de raca hardcoded (agora a normalização usa tabela racas)
-- ----------------------------------------------------------------------------
ALTER TABLE public.individuos DROP CONSTRAINT IF EXISTS individuos_raca_check;

-- ----------------------------------------------------------------------------
-- 2. Corrigir CHECK de status (Morte -> Morto)
-- ----------------------------------------------------------------------------
ALTER TABLE public.individuos DROP CONSTRAINT IF EXISTS individuos_status_check;
ALTER TABLE public.individuos ADD CONSTRAINT individuos_status_check
  CHECK (status = ANY (ARRAY['Vivo', 'Abatido', 'Doado', 'Morto', 'Transferido', 'Venda Vivo']));

-- ----------------------------------------------------------------------------
-- 3. Atualizar registros existentes com status 'Morte' para 'Morto'
-- ----------------------------------------------------------------------------
UPDATE public.individuos
SET status = 'Morto'
WHERE status = 'Morte';

-- ----------------------------------------------------------------------------
-- 4. Definir valores semânticos para sync_status
-- ----------------------------------------------------------------------------
-- Criar função auxiliar para calcular o sync_status com base nos campos essenciais
CREATE OR REPLACE FUNCTION public.calcular_sync_status_individuo(
  p_origem text,
  p_id_brinco text,
  p_id_chip text,
  p_id_manejo text,
  p_id_provisorio text,
  p_data_nascimento date,
  p_sexo text,
  p_categoria text,
  p_raca text,
  p_peso_nascimento numeric,
  p_status text,
  p_sync_status_atual text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_tem_identificacao boolean;
  v_essenciais_completos boolean;
BEGIN
  -- Identificação: pelo menos uma forma de identificação preenchida
  v_tem_identificacao := COALESCE(NULLIF(TRIM(p_id_brinco), ''), '') <> ''
    OR COALESCE(NULLIF(TRIM(p_id_chip), ''), '') <> ''
    OR COALESCE(NULLIF(TRIM(p_id_manejo), ''), '') <> ''
    OR COALESCE(NULLIF(TRIM(p_id_provisorio), ''), '') <> '';

  -- Campos essenciais: identificação + data_nascimento + sexo + categoria + raca + peso + status
  v_essenciais_completos := v_tem_identificacao
    AND p_data_nascimento IS NOT NULL
    AND p_sexo IS NOT NULL
    AND p_categoria IS NOT NULL
    AND p_raca IS NOT NULL
    AND p_peso_nascimento IS NOT NULL
    AND p_status IS NOT NULL;

  -- Se foi criado automaticamente (origem = Nascimento) e nunca foi editado pelo usuário
  IF p_origem = 'Nascimento' AND (p_sync_status_atual IS NULL OR p_sync_status_atual = 'synced' OR p_sync_status_atual = 'automatico_incompleto') THEN
    IF v_essenciais_completos THEN
      RETURN 'manual_completo'; -- Usuário já completou após criação automática
    ELSE
      RETURN 'automatico_incompleto';
    END IF;
  END IF;

  -- Demais casos (criação manual, importação, etc.)
  IF v_essenciais_completos THEN
    RETURN 'manual_completo';
  ELSE
    RETURN 'manual_incompleto';
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Atualizar sync_status dos registros existentes
-- ----------------------------------------------------------------------------
UPDATE public.individuos
SET sync_status = public.calcular_sync_status_individuo(
  origem,
  id_brinco,
  id_chip,
  id_manejo,
  id_provisorio_cria,
  data_nascimento,
  sexo,
  categoria,
  raca,
  peso_nascimento_kg,
  status,
  sync_status
);

-- ----------------------------------------------------------------------------
-- 6. Adicionar CHECK constraint para sync_status
-- ----------------------------------------------------------------------------
ALTER TABLE public.individuos DROP CONSTRAINT IF EXISTS individuos_sync_status_check;
ALTER TABLE public.individuos ADD CONSTRAINT individuos_sync_status_check
  CHECK (sync_status IS NULL OR sync_status = ANY (ARRAY['automatico_incompleto', 'manual_completo', 'manual_incompleto']));

-- ----------------------------------------------------------------------------
-- 7. CHECK constraint para data_nascimento nao ser futura
-- ----------------------------------------------------------------------------
ALTER TABLE public.individuos DROP CONSTRAINT IF EXISTS individuos_data_nascimento_check;
ALTER TABLE public.individuos ADD CONSTRAINT individuos_data_nascimento_check
  CHECK (data_nascimento IS NULL OR data_nascimento <= CURRENT_DATE);

-- ----------------------------------------------------------------------------
-- 8. Unique indexes parciais para identificadores por fazenda
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_individuos_fazenda_brinco;
CREATE UNIQUE INDEX idx_individuos_fazenda_brinco_unico
  ON public.individuos (fazenda_id, id_brinco)
  WHERE deleted_at IS NULL AND id_brinco IS NOT NULL AND id_brinco <> '';

DROP INDEX IF EXISTS public.idx_individuos_fazenda_chip;
CREATE UNIQUE INDEX idx_individuos_fazenda_chip_unico
  ON public.individuos (fazenda_id, id_chip)
  WHERE deleted_at IS NULL AND id_chip IS NOT NULL AND id_chip <> '';

DROP INDEX IF EXISTS public.idx_individuos_fazenda_manejo;
CREATE UNIQUE INDEX idx_individuos_fazenda_manejo_unico
  ON public.individuos (fazenda_id, id_manejo)
  WHERE deleted_at IS NULL AND id_manejo IS NOT NULL AND id_manejo <> '';

-- ----------------------------------------------------------------------------
-- 9. Indexes para filtros comuns
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_status
  ON public.individuos (fazenda_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_categoria
  ON public.individuos (fazenda_id, categoria)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_sexo
  ON public.individuos (fazenda_id, sexo)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_origem
  ON public.individuos (fazenda_id, origem)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_sync_status
  ON public.individuos (fazenda_id, sync_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_lote
  ON public.individuos (fazenda_id, lote_atual)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_pasto
  ON public.individuos (fazenda_id, pasto_atual)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_data_nascimento
  ON public.individuos (fazenda_id, data_nascimento)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 10. Trigger de atualização automática de sync_status
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_individuos_atualizar_sync_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.sync_status := public.calcular_sync_status_individuo(
    NEW.origem,
    NEW.id_brinco,
    NEW.id_chip,
    NEW.id_manejo,
    NEW.id_provisorio_cria,
    NEW.data_nascimento,
    NEW.sexo,
    NEW.categoria,
    NEW.raca,
    NEW.peso_nascimento_kg,
    NEW.status,
    NEW.sync_status
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_individuos_atualizar_sync_status ON public.individuos;
CREATE TRIGGER trg_individuos_atualizar_sync_status
  BEFORE INSERT OR UPDATE ON public.individuos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_individuos_atualizar_sync_status();

-- ----------------------------------------------------------------------------
-- 11. Trigger de validação sexo/categoria
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_individuos_validar_sexo_categoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.sexo = 'Macho' AND NEW.categoria = ANY (ARRAY['Bezerra ao Pé', 'Bezerra Desmama', 'Novilha', 'Primípara', 'Vaca Parida', 'Vaca Prenha', 'Vaca Vazia', 'Vaca Descarte']) THEN
    RAISE EXCEPTION 'Categoria % não é permitida para indivíduos do sexo Macho', NEW.categoria;
  END IF;

  IF NEW.sexo = 'Fêmea' AND NEW.categoria = ANY (ARRAY['Bezerro ao Pé', 'Bezerro Desmama', 'Garrote', 'Boi Magro', 'Touro']) THEN
    RAISE EXCEPTION 'Categoria % não é permitida para indivíduos do sexo Fêmea', NEW.categoria;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_individuos_validar_sexo_categoria ON public.individuos;
CREATE TRIGGER trg_individuos_validar_sexo_categoria
  BEFORE INSERT OR UPDATE ON public.individuos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_individuos_validar_sexo_categoria();

-- ----------------------------------------------------------------------------
-- 12. Atualizar trigger de maternidade para definir sync_status automatico_incompleto
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_individual_from_maternidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pasto_uuid UUID;
  categoria_value TEXT;
  raca_normalizada TEXT;
  parto_array TEXT[];
  v_individuo_id UUID;
BEGIN
  IF NEW.individuo_id_cria IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.sexo = 'Macho' THEN
    categoria_value := 'Bezerro ao Pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    categoria_value := 'Bezerra ao Pé';
  ELSE
    categoria_value := NULL;
  END IF;

  SELECT nome INTO raca_normalizada
  FROM public.racas
  WHERE fazenda_id = NEW.fazenda_id
    AND UPPER(TRIM(nome)) = UPPER(TRIM(COALESCE(NEW.raca, '')))
    AND (ativo IS NULL OR ativo = true)
  LIMIT 1;

  IF raca_normalizada IS NULL THEN
    raca_normalizada := NEW.raca;
  END IF;

  IF NEW.pasto_id IS NOT NULL THEN
    pasto_uuid := NEW.pasto_id;
  ELSE
    SELECT id INTO pasto_uuid FROM public.pastos WHERE nome = NEW.pasto AND fazenda_id = NEW.fazenda_id LIMIT 1;
  END IF;

  IF NEW.tipo_parto IS NOT NULL AND jsonb_array_length(NEW.tipo_parto) > 0 THEN
    SELECT ARRAY(SELECT value::text FROM jsonb_array_elements_text(NEW.tipo_parto) AS value) INTO parto_array;
  ELSE
    parto_array := NULL;
  END IF;

  INSERT INTO public.individuos (
    fazenda_id, data_nascimento, data_entrada_fazenda, peso_nascimento_kg,
    id_provisorio_cria, id_brinco, id_chip, lote_atual, pasto_atual, sexo, raca,
    parto, id_brinco_mae, id_chip_mae, categoria, origem, status, sync_status
  ) VALUES (
    NEW.fazenda_id, NEW.data::DATE, NEW.data::DATE, NEW.peso_cria_kg::NUMERIC,
    NEW.id_provisorio_cria, NEW.id_brinco_cria, NEW.id_chip_cria, NEW.lote_id,
    pasto_uuid, NEW.sexo, raca_normalizada,
    parto_array,
    NEW.id_brinco_mae, NEW.id_chip_mae, categoria_value, 'Nascimento', 'Vivo', 'automatico_incompleto'
  )
  RETURNING id INTO v_individuo_id;

  UPDATE public.registros_maternidade
  SET individuo_id_cria = v_individuo_id
  WHERE id = NEW.id;

  PERFORM public.notificar_individuo_incompleto(
    NEW.fazenda_id,
    v_individuo_id,
    NEW.id_provisorio_cria,
    NEW.id_brinco_cria,
    NEW.id_chip_cria
  );

  RETURN NEW;
END;
$$;
;
