-- Tabela de registros de maternidade
CREATE TABLE registros_maternidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  peso_cria_kg NUMERIC(10,2),
  numero_cria TEXT,
  tratamento TEXT,
  tipo_parto TEXT,
  sexo TEXT,
  raca TEXT,
  numero_mae TEXT,
  categoria_mae TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_maternidade
CREATE INDEX idx_maternidade_fazenda ON registros_maternidade(fazenda_id);
CREATE INDEX idx_maternidade_data ON registros_maternidade(data);
CREATE INDEX idx_maternidade_sync ON registros_maternidade(sync_status);
CREATE INDEX idx_maternidade_dispositivo ON registros_maternidade(dispositivo_id);
CREATE INDEX idx_maternidade_deleted ON registros_maternidade(deleted_at) WHERE deleted_at IS NULL;;
