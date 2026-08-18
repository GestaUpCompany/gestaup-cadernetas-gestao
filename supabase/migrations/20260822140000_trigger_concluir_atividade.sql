-- Trigger: quando qualquer funcionario marca status_individual = 'concluida',
-- a atividade pai passa para status = 'concluido'
-- Nao exige que todos concluam; basta um responsavel

CREATE OR REPLACE FUNCTION fn_concluir_atividade_on_funcionario()
RETURNS TRIGGER AS $$
BEGIN
  -- So reage quando o status_individual muda para 'concluida'
  IF (TG_OP = 'UPDATE' AND NEW.status_individual = 'concluida' AND OLD.status_individual != 'concluida')
     OR (TG_OP = 'INSERT' AND NEW.status_individual = 'concluida') THEN
    UPDATE atividades
    SET status = 'concluido', updated_at = now()
    WHERE id = NEW.atividade_id
      AND status != 'concluido'
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_concluir_atividade_on_funcionario ON atividade_funcionarios;

CREATE TRIGGER trg_concluir_atividade_on_funcionario
  AFTER INSERT OR UPDATE OF status_individual ON atividade_funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION fn_concluir_atividade_on_funcionario();
