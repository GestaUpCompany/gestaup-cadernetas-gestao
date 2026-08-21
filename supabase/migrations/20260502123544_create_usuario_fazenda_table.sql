-- Tabela de relação usuario-fazenda (para sistema web)
CREATE TABLE usuario_fazenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  papel TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, fazenda_id)
);

-- Índices para usuario_fazenda
CREATE INDEX idx_usuario_fazenda_usuario ON usuario_fazenda(usuario_id);
CREATE INDEX idx_usuario_fazenda_fazenda ON usuario_fazenda(fazenda_id);
CREATE INDEX idx_usuario_fazenda_papel ON usuario_fazenda(papel);
CREATE INDEX idx_usuario_fazenda_ativo ON usuario_fazenda(ativo);;
