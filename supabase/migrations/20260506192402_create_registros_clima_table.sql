CREATE TABLE registros_clima (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  responsavel TEXT NOT NULL,
  temperatura_media NUMERIC,
  observacao TEXT,
  pluviometro_1_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_1_medicao NUMERIC,
  pluviometro_2_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_2_medicao NUMERIC,
  pluviometro_3_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_3_medicao NUMERIC,
  pluviometro_4_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_4_medicao NUMERIC,
  pluviometro_5_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_5_medicao NUMERIC,
  pluviometro_6_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_6_medicao NUMERIC,
  pluviometro_7_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_7_medicao NUMERIC,
  pluviometro_8_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_8_medicao NUMERIC,
  pluviometro_9_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_9_medicao NUMERIC,
  pluviometro_10_id UUID REFERENCES pluviometros(id) ON DELETE SET NULL,
  pluviometro_10_medicao NUMERIC,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index on fazenda_id for performance
CREATE INDEX idx_registros_clima_fazenda_id ON registros_clima(fazenda_id);
CREATE INDEX idx_registros_clima_data ON registros_clima(data);
CREATE INDEX idx_registros_clima_sync_status ON registros_clima(sync_status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registros_clima_updated_at
  BEFORE UPDATE ON registros_clima
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
