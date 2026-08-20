CREATE TABLE mortes_animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL,
  dispositivo_id UUID,
  nome_usuario TEXT,
  data DATE NOT NULL,
  brinco_chip TEXT,
  lote TEXT,
  pasto TEXT,
  categoria TEXT,
  causa_morte TEXT,
  causa_morte_obs TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT mortes_animais_fazenda_id_fkey FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE CASCADE
);

CREATE INDEX idx_mortes_animais_fazenda_id ON mortes_animais(fazenda_id);
CREATE INDEX idx_mortes_animais_data ON mortes_animais(data);
CREATE INDEX idx_mortes_animais_deleted_at ON mortes_animais(deleted_at);;
