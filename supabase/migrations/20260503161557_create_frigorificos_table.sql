CREATE TABLE frigorificos (
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

CREATE INDEX idx_frigorificos_fazenda_id ON frigorificos(fazenda_id);

COMMENT ON TABLE frigorificos IS 'Tabela de frigoríficos para abate e venda de gado';
COMMENT ON COLUMN frigorificos.cnpj IS 'CNPJ do frigorífico';
COMMENT ON COLUMN frigorificos.razao_social IS 'Razão social jurídica';;
