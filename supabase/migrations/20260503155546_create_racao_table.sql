CREATE TABLE racao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id),
  nome TEXT NOT NULL,
  marca TEXT,
  fabricante TEXT,
  tipo TEXT,
  composicao JSONB,
  unidade_medida TEXT,
  peso_saco NUMERIC,
  estoque_atual NUMERIC DEFAULT 0,
  estoque_minimo NUMERIC DEFAULT 0,
  custo_unitario NUMERIC,
  custo_saco NUMERIC,
  custo_total_estoque NUMERIC GENERATED ALWAYS AS (estoque_atual * custo_unitario) STORED,
  fornecedor TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_racao_fazenda_id ON racao(fazenda_id);

COMMENT ON TABLE racao IS 'Tabela de rações comerciais';
COMMENT ON COLUMN racao.composicao IS 'Composição nutricional em JSON';
COMMENT ON COLUMN racao.custo_total_estoque IS 'Custo total do estoque atual (calculado automaticamente)';;
