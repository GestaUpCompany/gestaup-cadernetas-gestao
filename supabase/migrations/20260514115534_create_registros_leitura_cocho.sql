-- Tabela de registros de leitura de cocho
CREATE TABLE registros_leitura_cocho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  quantidade_cabecas INTEGER,
  media_ms NUMERIC(5,2),
  anterior_ms NUMERIC(5,2),
  leitura_anterior NUMERIC(5,2),
  leitura_hoje NUMERIC(5,2) NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_leitura_cocho
CREATE INDEX idx_leitura_cocho_fazenda ON registros_leitura_cocho(fazenda_id);
CREATE INDEX idx_leitura_cocho_data ON registros_leitura_cocho(data);
CREATE INDEX idx_leitura_cocho_sync ON registros_leitura_cocho(sync_status);
CREATE INDEX idx_leitura_cocho_dispositivo ON registros_leitura_cocho(dispositivo_id);
CREATE INDEX idx_leitura_cocho_deleted ON registros_leitura_cocho(deleted_at) WHERE deleted_at IS NULL;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_registros_leitura_cocho_updated_at BEFORE UPDATE ON registros_leitura_cocho
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;
