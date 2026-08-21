-- Tabela de registros de bebedouros
CREATE TABLE registros_bebedouros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  responsavel TEXT,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  gado TEXT,
  categoria TEXT,
  leitura_bebedouro INTEGER CHECK (leitura_bebedouro >= 1 AND leitura_bebedouro <= 3),
  numero_bebedouro TEXT,
  observacao TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_bebedouros
CREATE INDEX idx_bebedouros_fazenda ON registros_bebedouros(fazenda_id);
CREATE INDEX idx_bebedouros_data ON registros_bebedouros(data);
CREATE INDEX idx_bebedouros_sync ON registros_bebedouros(sync_status);
CREATE INDEX idx_bebedouros_dispositivo ON registros_bebedouros(dispositivo_id);
CREATE INDEX idx_bebedouros_deleted ON registros_bebedouros(deleted_at) WHERE deleted_at IS NULL;;
