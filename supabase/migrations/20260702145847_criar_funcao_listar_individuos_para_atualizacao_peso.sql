-- Função para listar indivíduos elegíveis para atualização de peso
CREATE OR REPLACE FUNCTION listar_individuos_para_atualizacao_peso()
RETURNS TABLE(
  individuo_id UUID,
  identificacao TEXT,
  categoria TEXT,
  sexo TEXT,
  data_nascimento DATE,
  peso_base_kg NUMERIC,
  dias_decorridos INTEGER,
  gmd_kg_dia NUMERIC,
  peso_calculado NUMERIC,
  peso_atual NUMERIC,
  diferenca NUMERIC,
  status_atualizacao TEXT,
  estrategia_nutricional TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_peso_base NUMERIC;
  v_dias_decorridos INTEGER;
  v_peso_calculado NUMERIC;
  v_peso_atual NUMERIC;
  v_diferenca NUMERIC;
  v_status TEXT;
BEGIN
  -- Criar tabela temporária para resultados
  CREATE TEMPORARY TABLE IF NOT EXISTS temp_resultados (
    individuo_id UUID,
    identificacao TEXT,
    categoria TEXT,
    sexo TEXT,
    data_nascimento DATE,
    peso_base_kg NUMERIC,
    dias_decorridos INTEGER,
    gmd_kg_dia NUMERIC,
    peso_calculado NUMERIC,
    peso_atual NUMERIC,
    diferenca NUMERIC,
    status_atualizacao TEXT,
    estrategia_nutricional TEXT
  );
  
  -- Limpar tabela temporária
  TRUNCATE TABLE temp_resultados;
  
  -- Processar cada indivíduo elegível
  FOR v_peso_base IN 
    SELECT i.id
    FROM public.individuos i
    WHERE i.deleted_at IS NULL
      AND i.data_nascimento IS NOT NULL
      AND i.gmd_kg_cab_dia IS NOT NULL
      AND (i.peso_nascimento_kg IS NOT NULL OR i.pv_entrada_kg IS NOT NULL)
  LOOP
    -- Calcular valores para este indivíduo
    SELECT 
      COALESCE(i.pv_entrada_kg, i.peso_nascimento_kg),
      (CURRENT_DATE - i.data_nascimento)::INTEGER,
      i.gmd_kg_cab_dia,
      i.peso_atual_kg
    INTO v_peso_base, v_dias_decorridos, v_peso_base, v_peso_atual
    FROM public.individuos i
    WHERE i.id = v_peso_base;
    
    -- Calcular peso vivo atual
    v_peso_calculado := v_peso_base + (v_dias_decorridos * v_peso_base);
    
    -- Calcular diferença
    v_diferenca := COALESCE(v_peso_atual, 0) - v_peso_calculado;
    
    -- Determinar status
    IF v_peso_atual IS NULL THEN
      v_status := 'SEM_PESO_ATUAL';
    ELSEIF ABS(v_diferenca) <= 0.5 THEN
      v_status := 'ATUALIZADO';
    ELSE
      v_status := 'NECESSITA_ATUALIZACAO';
    END IF;
    
    -- Inserir na tabela temporária
    INSERT INTO temp_resultados
    SELECT 
      i.id,
      COALESCE(i.id_brinco, i.id_chip, i.id_manejo, i.id::TEXT),
      i.categoria,
      i.sexo,
      i.data_nascimento,
      v_peso_base,
      v_dias_decorridos,
      i.gmd_kg_cab_dia,
      v_peso_calculado,
      v_peso_atual,
      v_diferenca,
      v_status,
      i.estrategia_nutricional_nome
    FROM public.individuos i
    WHERE i.id = v_peso_base;
  END LOOP;
  
  -- Retornar resultados
  RETURN QUERY SELECT * FROM temp_resultados ORDER BY data_nascimento DESC;
  
  -- Limpar tabela temporária
  DROP TABLE IF EXISTS temp_resultados;
END;
$$;;
