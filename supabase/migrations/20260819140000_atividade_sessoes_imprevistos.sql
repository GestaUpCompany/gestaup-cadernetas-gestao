-- Time tracking por sessoes + imprevistos categorizados em atividades
-- Permite ao peao iniciar/pausar/retomar/concluir com cronometro real,
-- registrar imprevistos categorizados, e calcular tempo produtivo vs bruto.

-- ============================================================
-- 1) atividade_sessoes: uma linha por par Iniciar/Pausar
-- ============================================================
CREATE TABLE IF NOT EXISTS atividade_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_funcionario_id uuid NOT NULL REFERENCES atividade_funcionarios(id) ON DELETE CASCADE,
  inicio_at timestamptz NOT NULL,
  fim_at timestamptz,
  duracao_segundos integer,
  trabalhada boolean NOT NULL DEFAULT true,
  motivo_pausa text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ativ_sessoes_af ON atividade_sessoes(atividade_funcionario_id);
CREATE INDEX IF NOT EXISTS idx_ativ_sessoes_af_fim_null ON atividade_sessoes(atividade_funcionario_id) WHERE fim_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ativ_sessoes_inicio ON atividade_sessoes(inicio_at);

-- ============================================================
-- 2) atividade_imprevisto_categorias: seed por fazenda
-- ============================================================
CREATE TABLE IF NOT EXISTS atividade_imprevisto_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fazenda_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_ativ_imprev_categ_fazenda
  ON atividade_imprevisto_categorias(fazenda_id) WHERE ativo = true;

-- ============================================================
-- 3) atividade_imprevistos: eventos timestampados anexados
-- ============================================================
CREATE TABLE IF NOT EXISTS atividade_imprevistos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_funcionario_id uuid NOT NULL REFERENCES atividade_funcionarios(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text,
  ocorrido_at timestamptz NOT NULL DEFAULT now(),
  impacto_minutos integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ativ_imprev_af ON atividade_imprevistos(atividade_funcionario_id);
CREATE INDEX IF NOT EXISTS idx_ativ_imprev_ocorrido ON atividade_imprevistos(ocorrido_at);

-- ============================================================
-- 4) RLS + grants (espelha padrao permissivo de atividade_funcionarios)
-- ============================================================
ALTER TABLE atividade_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividade_imprevistos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividade_imprevisto_categorias ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON atividade_sessoes TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON atividade_imprevistos TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON atividade_imprevisto_categorias TO authenticated, anon;

-- Sessoes/imprevistos: sem fazenda_id direto, policies permissivas (igual atividade_funcionarios)
CREATE POLICY "atv_sessoes_select" ON atividade_sessoes FOR SELECT USING (true);
CREATE POLICY "atv_sessoes_insert" ON atividade_sessoes FOR INSERT WITH CHECK (true);
CREATE POLICY "atv_sessoes_update" ON atividade_sessoes FOR UPDATE USING (true);
CREATE POLICY "atv_sessoes_delete" ON atividade_sessoes FOR DELETE USING (true);

CREATE POLICY "atv_imprev_select" ON atividade_imprevistos FOR SELECT USING (true);
CREATE POLICY "atv_imprev_insert" ON atividade_imprevistos FOR INSERT WITH CHECK (true);
CREATE POLICY "atv_imprev_update" ON atividade_imprevistos FOR UPDATE USING (true);
CREATE POLICY "atv_imprev_delete" ON atividade_imprevistos FOR DELETE USING (true);

-- Categorias: select por acesso a fazenda, insert/update/delete permissivos (admin/controller)
CREATE POLICY "atv_imprev_categ_select" ON atividade_imprevisto_categorias
  FOR SELECT USING (user_has_fazenda_access(fazenda_id));
CREATE POLICY "atv_imprev_categ_insert" ON atividade_imprevisto_categorias
  FOR INSERT WITH CHECK (true);
CREATE POLICY "atv_imprev_categ_update" ON atividade_imprevisto_categorias
  FOR UPDATE USING (true);
CREATE POLICY "atv_imprev_categ_delete" ON atividade_imprevisto_categorias
  FOR DELETE USING (true);

-- ============================================================
-- 5) Trigger: recalcular tempo_gasto_segundos ao fechar sessao
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_tempo_gasto_af() RETURNS trigger AS $$
DECLARE
  af_id uuid;
  total_seg integer;
BEGIN
  af_id := COALESCE(NEW.atividade_funcionario_id, OLD.atividade_funcionario_id);
  IF af_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(duracao_segundos), 0) INTO total_seg
    FROM atividade_sessoes
    WHERE atividade_funcionario_id = af_id
      AND duracao_segundos IS NOT NULL
      AND trabalhada = true;

  UPDATE atividade_funcionarios
    SET tempo_gasto_segundos = total_seg
    WHERE id = af_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_recalc_tempo_gasto_af
  AFTER INSERT OR UPDATE OR DELETE ON atividade_sessoes
  FOR EACH ROW EXECUTE FUNCTION recalc_tempo_gasto_af();

-- ============================================================
-- 6) Seed de categorias de imprevisto para fazendas existentes
-- ============================================================
INSERT INTO atividade_imprevisto_categorias (fazenda_id, nome)
SELECT f.id, c.nome
FROM fazendas f
CROSS JOIN (VALUES
  ('Chuva/Tempo'),
  ('Gado escapou'),
  ('Cerca/instalacao'),
  ('Equipamento/veiculo'),
  ('Peao indisponivel'),
  ('Outro')
) AS c(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM atividade_imprevisto_categorias aic
  WHERE aic.fazenda_id = f.id AND aic.nome = c.nome
);

-- ============================================================
-- 7) Trigger: seed automatico para novas fazendas
-- ============================================================
CREATE OR REPLACE FUNCTION seed_imprevisto_categorias() RETURNS trigger AS $$
BEGIN
  INSERT INTO atividade_imprevisto_categorias (fazenda_id, nome) VALUES
    (NEW.id, 'Chuva/Tempo'),
    (NEW.id, 'Gado escapou'),
    (NEW.id, 'Cerca/instalacao'),
    (NEW.id, 'Equipamento/veiculo'),
    (NEW.id, 'Peao indisponivel'),
    (NEW.id, 'Outro');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_seed_imprevisto_categorias
  AFTER INSERT ON fazendas
  FOR EACH ROW EXECUTE FUNCTION seed_imprevisto_categorias();

-- ============================================================
-- 8) RPCs para o Painel Web (monitoramento em tempo real)
-- ============================================================
CREATE OR REPLACE FUNCTION get_sessoes_abertas_by_fazenda(p_fazenda_id uuid)
RETURNS TABLE (
  id uuid,
  atividade_funcionario_id uuid,
  inicio_at timestamptz,
  fim_at timestamptz,
  duracao_segundos integer,
  trabalhada boolean,
  motivo_pausa text,
  created_at timestamptz,
  funcionario_nome text,
  funcionario_id uuid,
  atividade_id uuid,
  atividade_titulo text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.atividade_funcionario_id, s.inicio_at, s.fim_at,
    s.duracao_segundos, s.trabalhada, s.motivo_pausa, s.created_at,
    f.nome, af.funcionario_id, a.id, a.titulo
  FROM atividade_sessoes s
  JOIN atividade_funcionarios af ON af.id = s.atividade_funcionario_id
  JOIN atividades a ON a.id = af.atividade_id
  JOIN funcionarios f ON f.id = af.funcionario_id
  WHERE a.fazenda_id = p_fazenda_id AND s.fim_at IS NULL
  ORDER BY s.inicio_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_imprevistos_recentes_by_fazenda(p_fazenda_id uuid, p_data_inicio timestamptz)
RETURNS TABLE (
  id uuid,
  atividade_funcionario_id uuid,
  tipo text,
  descricao text,
  ocorrido_at timestamptz,
  impacto_minutos integer,
  created_at timestamptz,
  funcionario_nome text,
  funcionario_id uuid,
  atividade_id uuid,
  atividade_titulo text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.atividade_funcionario_id, i.tipo, i.descricao,
    i.ocorrido_at, i.impacto_minutos, i.created_at,
    f.nome, af.funcionario_id, a.id, a.titulo
  FROM atividade_imprevistos i
  JOIN atividade_funcionarios af ON af.id = i.atividade_funcionario_id
  JOIN atividades a ON a.id = af.atividade_id
  JOIN funcionarios f ON f.id = af.funcionario_id
  WHERE a.fazenda_id = p_fazenda_id AND i.ocorrido_at >= p_data_inicio
  ORDER BY i.ocorrido_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
