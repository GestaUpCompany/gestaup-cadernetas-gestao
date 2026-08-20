-- Criar tabela bebedouros
CREATE TABLE bebedouros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  capacidade NUMERIC,
  data_ultima_limpeza DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_bebedouros_fazenda_id ON bebedouros(fazenda_id);
CREATE INDEX idx_bebedouros_ativo ON bebedouros(ativo);

-- Habilitar RLS
ALTER TABLE bebedouros ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Enable read access for all authenticated users" ON bebedouros
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON bebedouros
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON bebedouros
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for all authenticated users" ON bebedouros
FOR DELETE
TO authenticated
USING (true);

-- Conceder permissões
GRANT SELECT ON bebedouros TO authenticated;
GRANT INSERT ON bebedouros TO authenticated;
GRANT UPDATE ON bebedouros TO authenticated;
GRANT DELETE ON bebedouros TO authenticated;
GRANT SELECT ON bebedouros TO anon;
GRANT INSERT ON bebedouros TO anon;
GRANT UPDATE ON bebedouros TO anon;
GRANT DELETE ON bebedouros TO anon;;
