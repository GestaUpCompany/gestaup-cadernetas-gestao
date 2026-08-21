-- Tabela de registros de enfermaria
CREATE TABLE registros_enfermaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  brinco_chip TEXT,
  categoria TEXT,
  tratamento TEXT,
  tratamento_outros TEXT,
  problema_casco BOOLEAN DEFAULT false,
  problema_casco_obs TEXT,
  sintomas_pneumonia BOOLEAN DEFAULT false,
  sintomas_pneumonia_obs TEXT,
  picado_cobra BOOLEAN DEFAULT false,
  picado_cobra_obs TEXT,
  incoordenacao_tremores BOOLEAN DEFAULT false,
  incoordenacao_tremores_obs TEXT,
  febre_alta BOOLEAN DEFAULT false,
  febre_alta_obs TEXT,
  presenca_sangue BOOLEAN DEFAULT false,
  presenca_sangue_obs TEXT,
  fraturas BOOLEAN DEFAULT false,
  fraturas_obs TEXT,
  desordens_digestivas BOOLEAN DEFAULT false,
  desordens_digestivas_obs TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_enfermaria
CREATE INDEX idx_enfermaria_fazenda ON registros_enfermaria(fazenda_id);
CREATE INDEX idx_enfermaria_data ON registros_enfermaria(data);
CREATE INDEX idx_enfermaria_sync ON registros_enfermaria(sync_status);
CREATE INDEX idx_enfermaria_dispositivo ON registros_enfermaria(dispositivo_id);
CREATE INDEX idx_enfermaria_deleted ON registros_enfermaria(deleted_at) WHERE deleted_at IS NULL;;
