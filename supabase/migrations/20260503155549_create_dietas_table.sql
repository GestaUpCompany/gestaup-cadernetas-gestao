CREATE TABLE dietas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  insumos JSONB,
  custo_total NUMERIC,
  custo_diario_animal NUMERIC,
  consumo_diario_kg NUMERIC,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dietas_fazenda_id ON dietas(fazenda_id);

COMMENT ON TABLE dietas IS 'Tabela de dietas personalizadas/combinações de insumos';
COMMENT ON COLUMN dietas.insumos IS 'Lista de insumos com quantidades em JSON';
COMMENT ON COLUMN dietas.custo_total IS 'Custo total da dieta';
COMMENT ON COLUMN dietas.custo_diario_animal IS 'Custo por animal por dia';
COMMENT ON COLUMN dietas.consumo_diario_kg IS 'Consumo diário em kg por animal';;
