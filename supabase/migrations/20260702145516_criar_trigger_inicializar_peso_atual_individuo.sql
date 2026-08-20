-- Função para inicializar peso_atual_kg baseado em regras de negócio
CREATE OR REPLACE FUNCTION inicializar_peso_atual_individuo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se peso_atual_kg está NULL e temos peso de entrada ou nascimento, inicializa
  IF NEW.peso_atual_kg IS NULL THEN
    -- Prioridade 1: pv_entrada_kg (peso vivo de entrada)
    IF NEW.pv_entrada_kg IS NOT NULL THEN
      NEW.peso_atual_kg := NEW.pv_entrada_kg;
    
    -- Prioridade 2: peso_nascimento_kg (para bezerros)
    ELSIF NEW.peso_nascimento_kg IS NOT NULL THEN
      NEW.peso_atual_kg := NEW.peso_nascimento_kg;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para inicializar peso_atual_kg ao inserir ou atualizar indivíduo
DROP TRIGGER IF EXISTS trg_inicializar_peso_atual_individuo ON public.individuos;
CREATE TRIGGER trg_inicializar_peso_atual_individuo
BEFORE INSERT OR UPDATE OF pv_entrada_kg, peso_nascimento_kg, peso_atual_kg
ON public.individuos
FOR EACH ROW
EXECUTE FUNCTION inicializar_peso_atual_individuo();;
