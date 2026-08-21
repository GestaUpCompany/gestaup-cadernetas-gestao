-- Corrigir função para listar indivíduos elegíveis para atualização de peso
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
  individuo_record RECORD;
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
  FOR individuo_record IN 
    SELECT 
      i.id,
      i.id_brinco,
      i.id_chip,
      i.id_manejo,
      i.categoria,
      i.sexo,
      i.data_nascimento,
      i.peso_nascimento_kg,
      i.pv_entrada_kg,
      i.gmd_kg_cab_dia,
      i.peso_atual_kg,
      i.estrategia_nutricional_nome
    FROM public.individuos i
    WHERE i.deleted_at IS NULL
      AND i.data_nascimento IS NOT NULL
      AND i.gmd_kg_cab_dia IS NOT NULL
      AND (i.peso_nascimento_kg IS NOT NULL OR i.pv_entrada_kg IS NOT NULL)
  LOOP
    -- Determinar peso base (prioridade: pv_entrada_kg > peso_nascimento_kg)
    v_peso_base := COALESCE(individuo_record.pv_entrada_kg, individuo_record.peso_nascimento_kg);
    
    -- Calcular dias decorridos
    v_dias_decorridos := (CURRENT_DATE - individuo_record.data_nascimento)::INTEGER;
    
    -- Calcular peso vivo atual
    v_peso_calculado := v_peso_base + (v_dias_decorridos * individuo_record.gmd_kg_cab_dia);
    
    -- Calcular diferença
    IF individuo_record.peso_atual_kg IS NOT NULL THEN
      v_diferenca := individuo_record.peso_atual_kg - v_peso_calculado;
    ELSE
      v_diferenca := NULL;
    END IF;
    
    -- Determinar status
    IF individuo_record.peso_atual_kg IS NULL THEN
      v_status := 'SEM_PESO_ATUAL';
    ELSEIF ABS(v_diferenca) <= 0.5 THEN
      v_status := 'ATUALIZADO';
    ELSE
      v_status := 'NECESSITA_ATUALIZACAO';
    END IF;
    
    -- Inserir na tabela temporária
    INSERT INTO temp_resultados
    VALUES (
      individuo_record.id,
      COALESCE(individuo_record.id_brinco, individuo_record.id_chip, individuo_record.id_manejo, individuo_record.id::TEXT),
      individuo_record.categoria,
      individuo_record.sexo,
      individuo_record.data_nascimento,
      v_peso_base,
      v_dias_decorridos,
      individuo_record.gmd_kg_cab_dia,
      v_peso_calculado,
      individuo_record.peso_atual_kg,
      v_diferenca,
      v_status,
      individuo_record.estrategia_nutricional_nome
    );
  END LOOP;
  
  -- Retornar resultados
  RETURN QUERY SELECT * FROM temp_resultados ORDER BY data_nascimento DESC;
  
  -- Limpar tabela temporária
  DROP TABLE IF EXISTS temp_resultados;
END;
$$;;
