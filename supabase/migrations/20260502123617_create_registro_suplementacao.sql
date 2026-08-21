-- Tabela de registros de suplementação
CREATE TABLE registros_suplementacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  tratador TEXT,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  produto TEXT,
  gado TEXT,
  vaca BOOLEAN DEFAULT false,
  touro BOOLEAN DEFAULT false,
  bezerro BOOLEAN DEFAULT false,
  boi BOOLEAN DEFAULT false,
  garrote BOOLEAN DEFAULT false,
  novilha BOOLEAN DEFAULT false,
  leitura INTEGER CHECK (leitura >= -1 AND leitura <= 3),
  sacos INTEGER DEFAULT 0,
  kg_cocho NUMERIC(10,2) DEFAULT 0,
  kg_deposito NUMERIC(10,2) DEFAULT 0,
  creep INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_suplementacao
CREATE INDEX idx_suplementacao_fazenda ON registros_suplementacao(fazenda_id);
CREATE INDEX idx_suplementacao_data ON registros_suplementacao(data);
CREATE INDEX idx_suplementacao_sync ON registros_suplementacao(sync_status);
CREATE INDEX idx_suplementacao_dispositivo ON registros_suplementacao(dispositivo_id);
CREATE INDEX idx_suplementacao_deleted ON registros_suplementacao(deleted_at) WHERE deleted_at IS NULL;;
