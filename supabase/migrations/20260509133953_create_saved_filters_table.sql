CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE,
  tela VARCHAR(100) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  filtros JSONB NOT NULL,
  is_preset BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_saved_filters_usuario ON saved_filters(usuario_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_fazenda ON saved_filters(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_tela ON saved_filters(tela);
CREATE INDEX IF NOT EXISTS idx_saved_filters_preset ON saved_filters(is_preset);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_filters_updated_at BEFORE UPDATE ON saved_filters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;
