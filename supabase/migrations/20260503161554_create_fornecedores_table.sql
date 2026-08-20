CREATE TABLE fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id),
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fornecedores_fazenda_id ON fornecedores(fazenda_id);

COMMENT ON TABLE fornecedores IS 'Tabela de fornecedores de insumos e produtos';
COMMENT ON COLUMN fornecedores.cnpj IS 'CNPJ do fornecedor';
COMMENT ON COLUMN fornecedores.razao_social IS 'Razão social jurídica';;
