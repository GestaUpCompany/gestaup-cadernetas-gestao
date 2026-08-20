
-- Corrigir a lógica de sync_status para manter auto-created até revisão do usuário

-- Atualizar função para não alterar registros automatico_incompleto automaticamente
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
  -- Se o registro já está marcado como criado automaticamente e incompleto,
  -- mantém esse status até o usuário explicitamente revisar (alterar o sync_status)
  IF p_sync_status_atual = 'automatico_incompleto' THEN
    RETURN 'automatico_incompleto';
  END IF;

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

  IF v_essenciais_completos THEN
    RETURN 'manual_completo';
  ELSE
    RETURN 'manual_incompleto';
  END IF;
END;
$$;

-- Atualizar registros existentes: auto-created (origem = Nascimento) voltam para automatico_incompleto
-- para que o usuário possa revisá-los, mesmo que os campos essenciais estejam preenchidos
UPDATE public.individuos
SET sync_status = 'automatico_incompleto'
WHERE origem = 'Nascimento' AND deleted_at IS NULL;

-- Atualizar registros nao-auto (origem != Nascimento ou NULL) com base na completude
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
)
WHERE origem IS DISTINCT FROM 'Nascimento' AND deleted_at IS NULL;
;
