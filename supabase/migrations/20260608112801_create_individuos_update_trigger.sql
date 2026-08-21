-- Create UPDATE trigger to recalculate computed fields when base fields change
CREATE TRIGGER trg_individuos_update_computed_fields
BEFORE UPDATE ON individuos
FOR EACH ROW
WHEN (
  OLD.data_nascimento IS DISTINCT FROM NEW.data_nascimento OR
  OLD.data_entrada_fazenda IS DISTINCT FROM NEW.data_entrada_fazenda OR
  OLD.data_desmama IS DISTINCT FROM NEW.data_desmama OR
  OLD.data_liberacao_sisbov IS DISTINCT FROM NEW.data_liberacao_sisbov
)
EXECUTE FUNCTION calculate_individuos_computed_fields();;
