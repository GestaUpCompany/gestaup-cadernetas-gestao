-- Função para atualizar pesos dos indivíduos diariamente
CREATE OR REPLACE FUNCTION update_pesos_individuos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  individuo_record RECORD;
BEGIN
  -- Atualizar peso_atual_kg para cada indivíduo que tem peso definido e GMD
  FOR individuo_record IN 
    SELECT 
      i.id,
      i.peso_atual_kg,
      i.gmd_kg_cab_dia,
      i.pv_entrada_kg,
      i.peso_nascimento_kg,
      i.estrategia_nutricional_id
    FROM public.individuos i
    WHERE i.deleted_at IS NULL
      AND i.gmd_kg_cab_dia IS NOT NULL
      AND i.gmd_kg_cab_dia > 0
      AND (
        i.peso_atual_kg IS NOT NULL 
        OR i.pv_entrada_kg IS NOT NULL 
        OR i.peso_nascimento_kg IS NOT NULL
      )
  LOOP
    -- Se não tem peso_atual_kg mas tem peso de entrada, inicializa
    IF individuo_record.peso_atual_kg IS NULL THEN
      -- Prioridade: pv_entrada_kg > peso_nascimento_kg
      IF individuo_record.pv_entrada_kg IS NOT NULL THEN
        individuo_record.peso_atual_kg := individuo_record.pv_entrada_kg;
      ELSIF individuo_record.peso_nascimento_kg IS NOT NULL THEN
        individuo_record.peso_atual_kg := individuo_record.peso_nascimento_kg;
      ELSE
        CONTINUE; -- Pula para próximo se não tiver peso base
      END IF;
    END IF;
    
    -- Atualizar peso: peso_atual = peso_atual + (GMD × 1 dia)
    UPDATE public.individuos
    SET peso_atual_kg = individuo_record.peso_atual_kg + individuo_record.gmd_kg_cab_dia,
        updated_at = now()
    WHERE id = individuo_record.id;
  END LOOP;
END;
$$;;
