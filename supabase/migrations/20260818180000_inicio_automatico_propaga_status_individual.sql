-- Corrige: quando uma atividade tem inicio_automatico=true e data_inicio <= hoje,
-- o status da atividade vira 'em_andamento' (trigger/cron ja existente), mas
-- atividade_funcionarios.status_individual permanecia 'pendente'.
-- O PWA usa status_individual para o rodapé do card ("Aguardando início" vs botão "Concluir"),
-- e nao tem botao "Iniciar" manual, entao o funcionario ficava preso em "Aguardando início".

-- 1. Trigger BEFORE INSERT em atividade_funcionarios:
--    Se a atividade pai tem inicio_automatico=true e data_inicio <= hoje,
--    o registro nasce com status_individual='em_andamento' e inicio_at=now()
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
  -- inicio_automatico: ativar atividades pendentes cuja data_inicio chegou
  UPDATE atividades
  SET status = 'em_andamento', updated_at = now()
  WHERE inicio_automatico = true
    AND status = 'pendente'
    AND data_inicio <= CURRENT_DATE
    AND deleted_at IS NULL;

  -- Propagar para atividade_funcionarios: pendentes -> em_andamento com inicio_at
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

  -- atrasado: marcar atividades nao concluidas cujo prazo passou
  UPDATE atividades
  SET status = 'atrasado', updated_at = now()
  WHERE data_fim < CURRENT_DATE
    AND status NOT IN ('concluido', 'atrasado')
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill: corrigir atividade_funcionarios existentes que ficaram presos
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
