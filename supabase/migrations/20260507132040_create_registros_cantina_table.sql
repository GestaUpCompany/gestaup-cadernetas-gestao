-- Criar tabela registros_cantina
CREATE TABLE IF NOT EXISTS registros_cantina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id TEXT,
  dispositivo_id TEXT,
  data TEXT NOT NULL,
  numero_cozinheiras INTEGER,
  quem_cozinhou TEXT,
  quem_ajudou TEXT,
  numero_cafe_manha INTEGER,
  numero_lanches INTEGER,
  numero_refeicoes_almoco INTEGER,
  numero_refeicoes_jantar INTEGER,
  itens JSONB,
  observacao TEXT,
  nome_usuario TEXT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_registros_cantina_fazenda_id ON registros_cantina(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_registros_cantina_dispositivo_id ON registros_cantina(dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_registros_cantina_data ON registros_cantina(data);
CREATE INDEX IF NOT EXISTS idx_registros_cantina_sync_status ON registros_cantina(sync_status);
CREATE INDEX IF NOT EXISTS idx_registros_cantina_version ON registros_cantina(version);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registros_cantina_updated_at
  BEFORE UPDATE ON registros_cantina
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
