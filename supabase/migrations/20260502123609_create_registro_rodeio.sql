-- Tabela de registros de rodeio
CREATE TABLE registros_rodeio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  vaca INTEGER DEFAULT 0,
  touro INTEGER DEFAULT 0,
  bezerro INTEGER DEFAULT 0,
  boi INTEGER DEFAULT 0,
  garrote INTEGER DEFAULT 0,
  novilha INTEGER DEFAULT 0,
  total_cabecas INTEGER DEFAULT 0,
  escore_gado_ideal BOOLEAN,
  escore_gado_ideal_obs TEXT,
  agua_boa_bebedouro BOOLEAN,
  agua_boa_bebedouro_obs TEXT,
  pastagem_adequada BOOLEAN,
  pastagem_adequada_obs TEXT,
  animais_doentes BOOLEAN,
  animais_doentes_obs TEXT,
  cercas_cochos BOOLEAN,
  cercas_cochos_obs TEXT,
  carrapatos_moscas BOOLEAN,
  carrapatos_moscas_obs TEXT,
  animais_entrevero BOOLEAN,
  animais_entrevero_obs TEXT,
  animal_morto BOOLEAN,
  animal_morto_obs TEXT,
  animais_tratados INTEGER DEFAULT 0,
  escore_fezes INTEGER CHECK (escore_fezes >= 1 AND escore_fezes <= 5),
  equipe INTEGER,
  procedimentos TEXT[],
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_rodeio
CREATE INDEX idx_rodeio_fazenda ON registros_rodeio(fazenda_id);
CREATE INDEX idx_rodeio_data ON registros_rodeio(data);
CREATE INDEX idx_rodeio_sync ON registros_rodeio(sync_status);
CREATE INDEX idx_rodeio_dispositivo ON registros_rodeio(dispositivo_id);
CREATE INDEX idx_rodeio_deleted ON registros_rodeio(deleted_at) WHERE deleted_at IS NULL;;
