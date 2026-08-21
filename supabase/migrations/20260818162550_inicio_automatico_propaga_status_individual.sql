-- 1. Trigger BEFORE INSERT em atividade_funcionarios
CREATE OR REPLACE FUNCTION fn_inicio_automatico_af_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_atividade_inicio_automatico boolean;
  v_atividade_data_inicio date;
  v_atividade_status text;
BEGIN
  SELECT a.inicio_automatico, a.data_inicio, a.status
    INTO v_atividade_inicio_automatico, v_atividade_data_inicio, v_atividade_status
    FROM atividades a
    WHERE a.id = NEW.atividade_id;

  IF v_atividade_inicio_automatico = true
     AND v_atividade_data_inicio <= CURRENT_DATE
     AND v_atividade_status = 'em_andamento'
     AND NEW.status_individual = 'pendente' THEN
    NEW.status_individual := 'em_andamento';
    NEW.inicio_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_inicio_automatico_af_on_insert ON atividade_funcionarios;

CREATE TRIGGER trg_inicio_automatico_af_on_insert
  BEFORE INSERT ON atividade_funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION fn_inicio_automatico_af_on_insert();

-- 2. Atualizar o cron para tambem propagar para atividade_funcionarios
CREATE OR REPLACE FUNCTION fn_atualizar_status_atividades_automatico()
RETURNS void AS $$
BEGIN
  UPDATE atividades
  SET status = 'em_andamento', updated_at = now()
  WHERE inicio_automatico = true
    AND status = 'pendente'
    AND data_inicio <= CURRENT_DATE
    AND deleted_at IS NULL;

  UPDATE atividade_funcionarios af
  SET status_individual = 'em_andamento',
      inicio_at = COALESCE(af.inicio_at, now()),
      updated_at = now()
  FROM atividades a
  WHERE af.atividade_id = a.id
    AND a.inicio_automatico = true
    AND a.status = 'em_andamento'
    AND a.data_inicio <= CURRENT_DATE
    AND a.deleted_at IS NULL
    AND af.status_individual = 'pendente';

  UPDATE atividades
  SET status = 'atrasado', updated_at = now()
  WHERE data_fim < CURRENT_DATE
    AND status NOT IN ('concluido', 'atrasado')
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill
UPDATE atividade_funcionarios af
SET status_individual = 'em_andamento',
    inicio_at = COALESCE(af.inicio_at, now()),
    updated_at = now()
FROM atividades a
WHERE af.atividade_id = a.id
  AND a.inicio_automatico = true
  AND a.status = 'em_andamento'
  AND a.data_inicio <= CURRENT_DATE
  AND a.deleted_at IS NULL
  AND af.status_individual = 'pendente';;
