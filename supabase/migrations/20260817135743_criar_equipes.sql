-- Tabela de equipes para planejamento de atividades
CREATE TABLE IF NOT EXISTS equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_equipes_fazenda ON equipes(fazenda_id);
CREATE UNIQUE INDEX uq_equipes_fazenda_nome_ativo ON equipes(fazenda_id, nome) WHERE ativo = true AND deleted_at IS NULL;

ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipes_select ON equipes FOR SELECT USING (true);
CREATE POLICY equipes_insert ON equipes FOR INSERT WITH CHECK (true);
CREATE POLICY equipes_update ON equipes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY equipes_delete ON equipes FOR DELETE USING (true);

CREATE TRIGGER trg_equipes_updated_at BEFORE UPDATE ON equipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar equipe_id em funcionarios
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS equipe_id uuid REFERENCES equipes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_equipe ON funcionarios(equipe_id);;
