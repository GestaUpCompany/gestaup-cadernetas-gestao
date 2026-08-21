-- Criar tabela de registros de leitura de cocho
CREATE TABLE IF NOT EXISTS registros_leitura_cocho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  pasto TEXT,
  lote TEXT,
  quantidade_cabecas INTEGER,
  media_ms NUMERIC(10,2),
  anterior_ms NUMERIC(10,2),
  leitura_anterior NUMERIC(10,2),
  leitura_hoje NUMERIC(10,2),
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_leitura_cocho_fazenda ON registros_leitura_cocho(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_leitura_cocho_data ON registros_leitura_cocho(data);
CREATE INDEX IF NOT EXISTS idx_leitura_cocho_sync ON registros_leitura_cocho(sync_status);
CREATE INDEX IF NOT EXISTS idx_leitura_cocho_dispositivo ON registros_leitura_cocho(dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_leitura_cocho_deleted ON registros_leitura_cocho(deleted_at) WHERE deleted_at IS NULL;;
