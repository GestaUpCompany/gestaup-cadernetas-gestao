-- Criar tabela bebedouros se não existir
CREATE TABLE IF NOT EXISTS bebedouros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  capacidade_litros INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_bebedouros_fazenda ON bebedouros(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_bebedouros_nome ON bebedouros(nome);;
