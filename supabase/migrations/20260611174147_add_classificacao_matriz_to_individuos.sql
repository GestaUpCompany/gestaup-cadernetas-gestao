
-- Add the new column
ALTER TABLE public.individuos ADD COLUMN classificacao_matriz TEXT NULL;

-- Add check constraint for valid values
ALTER TABLE public.individuos ADD CONSTRAINT individuos_classificacao_matriz_check
  CHECK (classificacao_matriz IS NULL OR classificacao_matriz IN ('Nulípara', 'Primípara', 'Secundípara', 'Multípara'));

-- Function to compute classificacao_matriz based on maternity record count
CREATE OR REPLACE FUNCTION compute_classificacao_matriz(p_individuo_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.registros_maternidade
  WHERE individuo_id_mae = p_individuo_id AND deleted_at IS NULL;

  IF v_count = 0 THEN
    RETURN 'Nulípara';
  ELSIF v_count = 1 THEN
    RETURN 'Primípara';
  ELSIF v_count = 2 THEN
    RETURN 'Secundípara';
  ELSE
    RETURN 'Multípara';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update classificacao_matriz for a given individuo
CREATE OR REPLACE FUNCTION update_classificacao_matriz(p_individuo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.individuos
  SET classificacao_matriz = compute_classificacao_matriz(p_individuo_id)
  WHERE id = p_individuo_id
    AND sexo = 'Fêmea'
    AND categoria IN ('Vaca Parida', 'Vaca Prenha', 'Vaca Vazia', 'Vaca Descarte', 'Primípara');
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update mother's classificacao_matriz after maternity record insert/update/delete
CREATE OR REPLACE FUNCTION trigger_update_classificacao_matriz()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.individuo_id_mae IS NOT NULL THEN
      PERFORM update_classificacao_matriz(OLD.individuo_id_mae);
    END IF;
    RETURN OLD;
  END IF;

  -- For INSERT or UPDATE, handle both old and new mother references
  IF TG_OP = 'UPDATE' THEN
    IF OLD.individuo_id_mae IS NOT NULL AND OLD.individuo_id_mae IS DISTINCT FROM NEW.individuo_id_mae THEN
      PERFORM update_classificacao_matriz(OLD.individuo_id_mae);
    END IF;
  END IF;

  IF NEW.individuo_id_mae IS NOT NULL THEN
    PERFORM update_classificacao_matriz(NEW.individuo_id_mae);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to avoid duplicate trigger
DROP TRIGGER IF EXISTS update_classificacao_matriz_on_maternidade ON public.registros_maternidade;

-- Create trigger
CREATE TRIGGER update_classificacao_matriz_on_maternidade
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_maternidade
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_classificacao_matriz();

-- Populate existing records: update all female cows with applicable categories
UPDATE public.individuos
SET classificacao_matriz = compute_classificacao_matriz(id)
WHERE sexo = 'Fêmea'
  AND categoria IN ('Vaca Parida', 'Vaca Prenha', 'Vaca Vazia', 'Vaca Descarte', 'Primípara');
;
