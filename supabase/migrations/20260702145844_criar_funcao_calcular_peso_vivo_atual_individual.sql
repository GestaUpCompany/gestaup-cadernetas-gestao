-- Função para calcular peso vivo atual baseado em tempo decorrido e GMD
CREATE OR REPLACE FUNCTION calcular_peso_vivo_atual_individual(
  p_individuo_id UUID,
  p_forcar_atualizacao BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  individuo_id UUID,
  identificacao TEXT,
  categoria TEXT,
  data_nascimento DATE,
  peso_base_kg NUMERIC,
  dias_decorridos INTEGER,
  gmd_kg_dia NUMERIC,
  peso_calculado NUMERIC,
  peso_atual NUMERIC,
  diferenca NUMERIC,
  status_atualizacao TEXT
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
  -- Obter dados do indivíduo
  SELECT 
    i.peso_nascimento_kg,
    i.pv_entrada_kg,
    i.data_nascimento,
    i.gmd_kg_cab_dia,
    i.peso_atual_kg,
    COALESCE(i.id_brinco, i.id_chip, i.id_manejo, i.id::TEXT) as identificacao,
    i.categoria
  INTO 
    v_peso_base, v_peso_base, v_dias_decorridos, v_dias_decorridos, v_peso_atual, 
    v_dias_decorridos, v_dias_decorridos
  FROM public.individuos i
  WHERE i.id = p_individuo_id
    AND i.deleted_at IS NULL
    AND i.data_nascimento IS NOT NULL
    AND i.gmd_kg_cab_dia IS NOT NULL;
  
  -- Se não encontrou o indivíduo, retorna vazio
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcular dias decorridos
  v_dias_decorridos := (CURRENT_DATE - v_dias_decorridos)::INTEGER;
  
  -- Determinar peso base (prioridade: pv_entrada_kg > peso_nascimento_kg)
  SELECT COALESCE(pv_entrada_kg, peso_nascimento_kg)
  INTO v_peso_base
  FROM public.individuos
  WHERE id = p_individuo_id;
  
  -- Calcular peso vivo atual
  v_peso_calculado := v_peso_base + (v_dias_decorridos * v_dias_decorridos);
  
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
  
  -- Se forçar atualização, atualiza o peso
  IF p_forcar_atualizacao AND v_status != 'ATUALIZADO' THEN
    UPDATE public.individuos
    SET peso_atual_kg = v_peso_calculado,
        updated_at = NOW()
    WHERE id = p_individuo_id;
    
    v_peso_atual := v_peso_calculado;
    v_status := 'ATUALIZADO_FORCADO';
  END IF;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    i.id,
    COALESCE(i.id_brinco, i.id_chip, i.id_manejo, i.id::TEXT),
    i.categoria,
    i.data_nascimento,
    v_peso_base,
    v_dias_decorridos,
    i.gmd_kg_cab_dia,
    v_peso_calculado,
    v_peso_atual,
    v_diferenca,
    v_status
  FROM public.individuos i
  WHERE i.id = p_individuo_id;
END;
$$;;
