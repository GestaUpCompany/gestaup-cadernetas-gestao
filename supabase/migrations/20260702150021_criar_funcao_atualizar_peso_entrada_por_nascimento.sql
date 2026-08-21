-- Função para atualizar pv_entrada_kg = peso_nascimento_kg para indivíduos elegíveis
CREATE OR REPLACE FUNCTION atualizar_peso_entrada_por_nascimento(
  p_limite_atualizacao INTEGER DEFAULT 1000,
  p_forcar_atualizacao BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  total_processados INTEGER,
  total_atualizados INTEGER,
  detalhes_atualizacoes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  individuo_record RECORD;
  v_total_processados INTEGER := 0;
  v_total_atualizados INTEGER := 0;
  v_detalhes TEXT[] := ARRAY[]::TEXT[];
  v_contador INTEGER := 0;
BEGIN
  -- Processar cada indivíduo elegível
  FOR individuo_record IN 
    SELECT 
      i.id,
      COALESCE(i.id_brinco, i.id_chip, i.id_manejo, i.id::TEXT) as identificacao,
      i.categoria,
      i.sexo,
      i.data_nascimento,
      i.peso_nascimento_kg,
      i.pv_entrada_kg,
      i.peso_atual_kg,
      i.gmd_kg_cab_dia,
      i.estrategia_nutricional_nome
    FROM public.individuos i
    WHERE i.deleted_at IS NULL
      AND i.peso_nascimento_kg IS NOT NULL 
      AND (i.pv_entrada_kg IS NULL OR p_forcar_atualizacao = TRUE)
    ORDER BY i.data_nascimento DESC
    LIMIT p_limite_atualizacao
  LOOP
    v_contador := v_contador + 1;
    v_total_processados := v_total_processados + 1;
    
    -- Atualizar pv_entrada_kg = peso_nascimento_kg
    UPDATE public.individuos
    SET pv_entrada_kg = individuo_record.peso_nascimento_kg,
        updated_at = NOW()
    WHERE id = individuo_record.id;
    
    v_total_atualizados := v_total_atualizados + 1;
    
    -- Adicionar detalhe
    v_detalhes := array_append(v_detalhes, 
      format('%s (%s): pv_entrada_kg %s → %s kg',
        individuo_record.identificacao,
        individuo_record.categoria,
        COALESCE(individuo_record.pv_entrada_kg::TEXT, 'NULL'),
        individuo_record.peso_nascimento_kg::TEXT
      )
    );
    
    -- Limitar para evitar sobrecarga
    IF v_contador >= p_limite_atualizacao THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    v_total_processados,
    v_total_atualizados,
    v_detalhes;
END;
$$;;
