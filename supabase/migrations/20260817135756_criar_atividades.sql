-- Tabela de atividades (planejamento semanal)
CREATE TABLE IF NOT EXISTS atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  setor_id uuid REFERENCES setores(id) ON DELETE SET NULL,
  equipe_id uuid REFERENCES equipes(id) ON DELETE SET NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  prioridade int NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'pendente',
  inicio_automatico boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_atividades_fazenda ON atividades(fazenda_id);
CREATE INDEX idx_atividades_data_inicio ON atividades(data_inicio);
CREATE INDEX idx_atividades_status ON atividades(status);
CREATE INDEX idx_atividades_prioridade ON atividades(prioridade);

ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY atividades_select ON atividades FOR SELECT USING (true);
CREATE POLICY atividades_insert ON atividades FOR INSERT WITH CHECK (true);
CREATE POLICY atividades_update ON atividades FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY atividades_delete ON atividades FOR DELETE USING (true);

CREATE TRIGGER trg_atividades_updated_at BEFORE UPDATE ON atividades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de juncao: atividade_funcionarios (status individual por funcionario)
CREATE TABLE IF NOT EXISTS atividade_funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id uuid NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  status_individual text NOT NULL DEFAULT 'pendente',
  inicio_at timestamptz,
  fim_at timestamptz,
  detalhamento text,
  tempo_gasto_segundos int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(atividade_id, funcionario_id)
);

CREATE INDEX idx_ativ_func_atividade ON atividade_funcionarios(atividade_id);
CREATE INDEX idx_ativ_func_funcionario ON atividade_funcionarios(funcionario_id);
CREATE INDEX idx_ativ_func_status ON atividade_funcionarios(status_individual);

ALTER TABLE atividade_funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY atv_func_select ON atividade_funcionarios FOR SELECT USING (true);
CREATE POLICY atv_func_insert ON atividade_funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY atv_func_update ON atividade_funcionarios FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY atv_func_delete ON atividade_funcionarios FOR DELETE USING (true);

CREATE TRIGGER trg_atv_func_updated_at BEFORE UPDATE ON atividade_funcionarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: calcular tempo_gasto_segundos ao concluir
CREATE OR REPLACE FUNCTION fn_calcular_tempo_gasto()
RETURNS trigger AS $$
BEGIN
  IF NEW.status_individual = 'concluida' AND OLD.status_individual != 'concluida' THEN
    IF NEW.inicio_at IS NOT NULL AND NEW.fim_at IS NOT NULL THEN
      NEW.tempo_gasto_segundos = EXTRACT(EPOCH FROM (NEW.fim_at - NEW.inicio_at))::int;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_tempo_gasto
  BEFORE UPDATE OF status_individual ON atividade_funcionarios
  FOR EACH ROW EXECUTE FUNCTION fn_calcular_tempo_gasto();

-- Trigger: atualizar status da atividade quando status individual muda
CREATE OR REPLACE FUNCTION fn_atividade_status_on_individual_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.status_individual = 'em_andamento' AND OLD.status_individual = 'pendente' THEN
    UPDATE atividades SET status = 'em_andamento'
    WHERE id = NEW.atividade_id AND status = 'pendente';
  END IF;
  IF NEW.status_individual = 'concluida' THEN
    IF NOT EXISTS (
      SELECT 1 FROM atividade_funcionarios
      WHERE atividade_id = NEW.atividade_id
        AND status_individual != 'concluida'
    ) THEN
      UPDATE atividades SET status = 'concluido' WHERE id = NEW.atividade_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_atividade_status_on_individual
  AFTER UPDATE OF status_individual ON atividade_funcionarios
  FOR EACH ROW EXECUTE FUNCTION fn_atividade_status_on_individual_change();;
