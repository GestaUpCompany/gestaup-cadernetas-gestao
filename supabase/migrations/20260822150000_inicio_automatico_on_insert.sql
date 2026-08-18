-- Trigger BEFORE INSERT: se inicio_automatico = true e data_inicio <= hoje,
-- a atividade ja nasce com status = 'em_andamento' em vez de 'pendente'
-- Complementa o cron hourly que cuida dos casos onde a data chegou apos a criacao

CREATE OR REPLACE FUNCTION fn_inicio_automatico_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inicio_automatico = true
     AND NEW.status = 'pendente'
     AND NEW.data_inicio <= CURRENT_DATE
     AND NEW.deleted_at IS NULL THEN
    NEW.status := 'em_andamento';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_inicio_automatico_on_insert ON atividades;

CREATE TRIGGER trg_inicio_automatico_on_insert
  BEFORE INSERT ON atividades
  FOR EACH ROW
  EXECUTE FUNCTION fn_inicio_automatico_on_insert();
