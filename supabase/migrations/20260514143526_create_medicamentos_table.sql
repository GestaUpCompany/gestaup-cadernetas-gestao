CREATE TABLE medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome_comercial TEXT NOT NULL,
  dose_recomendada TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Criar índice para busca por fazenda
CREATE INDEX idx_medicamentos_fazenda_id ON medicamentos(fazenda_id);
CREATE INDEX idx_medicamentos_deleted_at ON medicamentos(deleted_at);

-- Criar índice para busca por nome
CREATE INDEX idx_medicamentos_nome_comercial ON medicamentos(nome_comercial);;
