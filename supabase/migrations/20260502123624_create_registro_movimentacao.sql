-- Tabela de registros de movimentação
CREATE TABLE registros_movimentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  lote_origem_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  lote_destino_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  numero_cabecas INTEGER,
  peso_medio_kg NUMERIC(10,2),
  vaca BOOLEAN DEFAULT false,
  touro BOOLEAN DEFAULT false,
  boi_gordo BOOLEAN DEFAULT false,
  boi_magro BOOLEAN DEFAULT false,
  garrote BOOLEAN DEFAULT false,
  bezerro BOOLEAN DEFAULT false,
  novilha BOOLEAN DEFAULT false,
  tropa BOOLEAN DEFAULT false,
  outros BOOLEAN DEFAULT false,
  motivo_movimentacao TEXT,
  brinco_chip TEXT,
  causa_observacao TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_movimentacao
CREATE INDEX idx_movimentacao_fazenda ON registros_movimentacao(fazenda_id);
CREATE INDEX idx_movimentacao_data ON registros_movimentacao(data);
CREATE INDEX idx_movimentacao_sync ON registros_movimentacao(sync_status);
CREATE INDEX idx_movimentacao_dispositivo ON registros_movimentacao(dispositivo_id);
CREATE INDEX idx_movimentacao_deleted ON registros_movimentacao(deleted_at) WHERE deleted_at IS NULL;;
