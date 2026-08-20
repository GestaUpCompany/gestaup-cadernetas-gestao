-- Tabela de registros de pastagens
CREATE TABLE registros_pastagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  manejador TEXT,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  pasto_saida_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  avaliacao_saida INTEGER CHECK (avaliacao_saida >= 1 AND avaliacao_saida <= 5),
  pasto_entrada_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  avaliacao_entrada INTEGER CHECK (avaliacao_entrada >= 1 AND avaliacao_entrada <= 5),
  vaca INTEGER DEFAULT 0,
  touro INTEGER DEFAULT 0,
  bezerro INTEGER DEFAULT 0,
  boi_magro INTEGER DEFAULT 0,
  garrote INTEGER DEFAULT 0,
  novilha INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_pastagens
CREATE INDEX idx_pastagens_fazenda ON registros_pastagens(fazenda_id);
CREATE INDEX idx_pastagens_data ON registros_pastagens(data);
CREATE INDEX idx_pastagens_sync ON registros_pastagens(sync_status);
CREATE INDEX idx_pastagens_dispositivo ON registros_pastagens(dispositivo_id);
CREATE INDEX idx_pastagens_deleted ON registros_pastagens(deleted_at) WHERE deleted_at IS NULL;;
