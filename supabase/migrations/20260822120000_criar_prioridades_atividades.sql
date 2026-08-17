-- Tabela de nomes customizaveis de prioridades por fazenda
CREATE TABLE IF NOT EXISTS prioridades_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nivel int NOT NULL,
  nome text NOT NULL,
  UNIQUE(fazenda_id, nivel)
);

ALTER TABLE prioridades_atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY prioridades_select ON prioridades_atividades FOR SELECT USING (true);
CREATE POLICY prioridades_insert ON prioridades_atividades FOR INSERT WITH CHECK (true);
CREATE POLICY prioridades_update ON prioridades_atividades FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY prioridades_delete ON prioridades_atividades FOR DELETE USING (true);

-- Seed para todas as fazendas existentes
INSERT INTO prioridades_atividades (fazenda_id, nivel, nome)
SELECT f.id, n.nivel, n.nome
FROM fazendas f
CROSS JOIN (VALUES (1, 'Urgente'), (2, 'Importante'), (3, 'Planejado')) AS n(nivel, nome)
WHERE NOT EXISTS (
  SELECT 1 FROM prioridades_atividades pa WHERE pa.fazenda_id = f.id AND pa.nivel = n.nivel
);

-- Trigger para seed automatico em novas fazendas
CREATE OR REPLACE FUNCTION fn_seed_prioridades_nova_fazenda()
RETURNS trigger AS $$
BEGIN
  INSERT INTO prioridades_atividades (fazenda_id, nivel, nome) VALUES
    (NEW.id, 1, 'Urgente'),
    (NEW.id, 2, 'Importante'),
    (NEW.id, 3, 'Planejado');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_seed_prioridades_nova_fazenda
  AFTER INSERT ON fazendas
  FOR EACH ROW EXECUTE FUNCTION fn_seed_prioridades_nova_fazenda();
