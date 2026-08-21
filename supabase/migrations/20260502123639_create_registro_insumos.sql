-- Tabela de registros de entrada de insumos
CREATE TABLE registros_entrada_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data_entrada DATE NOT NULL,
  horario TEXT,
  produto TEXT,
  quantidade NUMERIC(10,2),
  valor_unitario NUMERIC(10,2),
  valor_total NUMERIC(10,2),
  nota_fiscal TEXT,
  fornecedor TEXT,
  placa TEXT,
  motorista TEXT,
  responsavel_recebimento TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_entrada_insumos
CREATE INDEX idx_entrada_insumos_fazenda ON registros_entrada_insumos(fazenda_id);
CREATE INDEX idx_entrada_insumos_data ON registros_entrada_insumos(data_entrada);
CREATE INDEX idx_entrada_insumos_sync ON registros_entrada_insumos(sync_status);
CREATE INDEX idx_entrada_insumos_dispositivo ON registros_entrada_insumos(dispositivo_id);
CREATE INDEX idx_entrada_insumos_deleted ON registros_entrada_insumos(deleted_at) WHERE deleted_at IS NULL;

-- Tabela de registros de saída de insumos
CREATE TABLE registros_saida_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data_producao DATE NOT NULL,
  dieta_produzida TEXT,
  destino_producao TEXT,
  total_produzido NUMERIC(10,2),
  insumos_quantidades JSONB,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_saida_insumos
CREATE INDEX idx_saida_insumos_fazenda ON registros_saida_insumos(fazenda_id);
CREATE INDEX idx_saida_insumos_data ON registros_saida_insumos(data_producao);
CREATE INDEX idx_saida_insumos_sync ON registros_saida_insumos(sync_status);
CREATE INDEX idx_saida_insumos_dispositivo ON registros_saida_insumos(dispositivo_id);
CREATE INDEX idx_saida_insumos_deleted ON registros_saida_insumos(deleted_at) WHERE deleted_at IS NULL;;
