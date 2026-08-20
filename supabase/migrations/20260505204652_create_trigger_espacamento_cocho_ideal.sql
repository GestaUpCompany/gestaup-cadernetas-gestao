-- Função para calcular espacamento_cocho_ideal
CREATE OR REPLACE FUNCTION calcular_espacamento_cocho_ideal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.espacamento_cocho_cm_cab IS NOT NULL THEN
    -- Ideal: 40 cm/cab, Tolerância: 5%
    -- Se a diferença percentual for <= 5%, então é ideal
    NEW.espacamento_cocho_ideal = ABS(NEW.espacamento_cocho_cm_cab - 40) / 40 <= 0.05;
  ELSE
    NEW.espacamento_cocho_ideal = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular automaticamente ao inserir ou atualizar
DROP TRIGGER IF EXISTS trigger_calcular_espacamento_cocho_ideal ON public.registros_suplementacao;
CREATE TRIGGER trigger_calcular_espacamento_cocho_ideal
  BEFORE INSERT OR UPDATE OF espacamento_cocho_cm_cab
  ON public.registros_suplementacao
  FOR EACH ROW
  EXECUTE FUNCTION calcular_espacamento_cocho_ideal();;
