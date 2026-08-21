-- Função para atualizar pesos em lote baseados nos cálculos
CREATE OR REPLACE FUNCTION atualizar_pesos_em_lote(
  p_limite_atualizacao INTEGER DEFAULT 100,
  p_forcar_todos BOOLEAN DEFAULT FALSE,
  p_tolerancia_diferenca NUMERIC DEFAULT 0.5
)
RETURNS TABLE(
  total_processados INTEGER,
  total_atualizados INTEGER,
  total_sem_peso INTEGER,
  total_ja_atualizados INTEGER,
  detalhes_atualizacoes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_individuo_record RECORD;
  v_peso_base NUMERIC;
  v_dias_decorridos INTEGER;
  v_peso_calculado NUMERIC;
  v_peso_atual NUMERIC;
  v_diferenca NUMERIC;
  v_status TEXT;
  v_total_processados INTEGER := 0;
  v_total_atualizados INTEGER := 0;
  v_total_sem_peso INTEGER := 0;
  v_total_ja_atualizados INTEGER := 0;
  v_detalhes TEXT[] := ARRAY[]::TEXT[];
  v_contador INTEGER := 0;
BEGIN
  -- Processar cada indivíduo elegível
  FOR v_individuo_record IN 
    SELECT 
      i.id,
      COALESCE(i.id_brinco, i.id_chip, i.id_manejo, i.id::TEXT) as identificacao,
      i.categoria,
      i.sexo,
      i.data_nascimento,
      COALESCE(i.pv_entrada_kg, i.peso_nascimento_kg) as peso_base,
      i.gmd_kg_cab_dia,
      i.peso_atual_kg,
      i.estrategia_nutricional_nome
    FROM public.individuos i
    WHERE i.deleted_at IS NULL
      AND i.data_nascimento IS NOT NULL
      AND i.gmd_kg_cab_dia IS NOT NULL
      AND (i.peso_nascimento_kg IS NOT NULL OR i.pv_entrada_kg IS NOT NULL)
    ORDER BY i.data_nascimento DESC
    LIMIT p_limite_atualizacao
  LOOP
    v_contador := v_contador + 1;
    v_total_processados := v_total_processados + 1;
    
    -- Calcular dias decorridos
    v_dias_decorridos := (CURRENT_DATE - v_individuo_record.data_nascimento)::INTEGER;
    
    -- Calcular peso vivo atual
    v_peso_calculado := v_individuo_record.peso_base + (v_dias_decorridos * v_individuo_record.gmd_kg_cab_dia);
    
    -- Calcular diferença
    IF v_individuo_record.peso_atual_kg IS NOT NULL THEN
      v_diferenca := v_individuo_record.peso_atual_kg - v_peso_calculado;
      
      -- Verificar se precisa atualizar
      IF p_forcar_todos OR ABS(v_diferenca) > p_tolerancia_diferenca THEN
        -- Atualizar peso
        UPDATE public.individuos
        SET peso_atual_kg = v_peso_calculado,
            updated_at = NOW()
        WHERE id = v_individuo_record.id;
        
        v_total_atualizados := v_total_atualizados + 1;
        
        -- Adicionar detalhe
        v_detalhes := array_append(v_detalhes, 
          format('%s (%s): %s → %s kg (%s dias, GMD: %s)',
            v_individuo_record.identificacao,
            v_individuo_record.categoria,
            COALESCE(v_individuo_record.peso_atual_kg::TEXT, 'NULL'),
            v_peso_calculado::TEXT,
            v_dias_decorridos,
            v_individuo_record.gmd_kg_cab_dia
          )
        );
      ELSE
        v_total_ja_atualizados := v_total_ja_atualizados + 1;
      END IF;
    ELSE
      -- Não tem peso atual, vamos definir
      UPDATE public.individuos
      SET peso_atual_kg = v_peso_calculado,
          updated_at = NOW()
      WHERE id = v_individuo_record.id;
      
      v_total_atualizados := v_total_atualizados + 1;
      v_total_sem_peso := v_total_sem_peso + 1;
      
      -- Adicionar detalhe
      v_detalhes := array_append(v_detalhes, 
        format('%s (%s): NULL → %s kg (%s dias, GMD: %s) [PRIMEIRO PESO]',
          v_individuo_record.identificacao,
          v_individuo_record.categoria,
          v_peso_calculado::TEXT,
          v_dias_decorridos,
          v_individuo_record.gmd_kg_cab_dia
        )
      );
    END IF;
    
    -- Limitar para evitar sobrecarga
    IF v_contador >= p_limite_atualizacao THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    v_total_processados,
    v_total_atualizados,
    v_total_sem_peso,
    v_total_ja_atualizados,
    v_detalhes;
END;
$$;;
