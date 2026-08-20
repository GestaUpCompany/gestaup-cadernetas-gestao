CREATE TABLE causas_morte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT causas_morte_fazenda_id_fkey FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE CASCADE
);

CREATE INDEX idx_causas_morte_fazenda_id ON causas_morte(fazenda_id);
CREATE INDEX idx_causas_morte_ativo ON causas_morte(ativo);;
