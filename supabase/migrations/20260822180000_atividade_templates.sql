-- Atividades recorrentes (templates)
-- Modelos pre-definidos que podem ser usados para criar atividades rapidamente

CREATE TABLE IF NOT EXISTS atividade_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES fazendas(id),
  titulo text NOT NULL,
  descricao text,
  local text,
  setor_id uuid REFERENCES setores(id),
  prioridade integer NOT NULL DEFAULT 3,
  inicio_automatico boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_atividade_templates_fazenda
  ON atividade_templates(fazenda_id)
  WHERE deleted_at IS NULL;

-- Junction: funcionarios associados a cada template
CREATE TABLE IF NOT EXISTS atividade_template_funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES atividade_templates(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES funcionarios(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, funcionario_id)
);

CREATE INDEX IF NOT EXISTS idx_atv_template_func_template
  ON atividade_template_funcionarios(template_id);

-- RLS
ALTER TABLE atividade_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividade_template_funcionarios ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON atividade_templates TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON atividade_template_funcionarios TO authenticated, anon;

-- Policies (usando funcoes SECURITY DEFINER para evitar recursao de RLS em usuario_fazenda)
CREATE POLICY "atividade_templates_select" ON atividade_templates
  FOR SELECT USING (user_has_fazenda_access(fazenda_id));

CREATE POLICY "atividade_templates_insert" ON atividade_templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "atividade_templates_update" ON atividade_templates
  FOR UPDATE USING (true);

CREATE POLICY "atividade_templates_delete" ON atividade_templates
  FOR DELETE USING (true);

CREATE POLICY "atv_template_func_select" ON atividade_template_funcionarios
  FOR SELECT USING (true);

CREATE POLICY "atv_template_func_insert" ON atividade_template_funcionarios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "atv_template_func_delete" ON atividade_template_funcionarios
  FOR DELETE USING (true);

-- Trigger updated_at
CREATE TRIGGER update_atividade_templates_updated_at
  BEFORE UPDATE ON atividade_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
