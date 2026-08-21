DROP TABLE IF EXISTS registros_operacoes_maquinas;

CREATE TABLE registros_operacoes_maquinas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL,
  dispositivo_id UUID,
  data DATE NOT NULL,
  veiculo_trator TEXT NOT NULL,
  implemento_utilizado TEXT NOT NULL,
  hora_inicial TEXT,
  hora_final TEXT,
  odometro_inicial TEXT NOT NULL,
  odometro_final TEXT NOT NULL,
  total_odometro TEXT,
  tipo_operacao TEXT NOT NULL,
  produto_aplicado TEXT,
  quantidade_total_aplicada TEXT,
  area_trabalhada TEXT,
  dose_aplicada TEXT,
  meta_diaria_batida TEXT,
  meta_diaria_batida_obs TEXT,
  algum_imprevisto TEXT,
  algum_imprevisto_obs TEXT,
  observacao TEXT,
  sync_status TEXT DEFAULT 'synced' NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  nome_usuario TEXT
);

CREATE INDEX idx_registros_operacoes_maquinas_sync_status ON registros_operacoes_maquinas(sync_status);
CREATE INDEX idx_registros_operacoes_maquinas_data ON registros_operacoes_maquinas(data);
CREATE INDEX idx_registros_operacoes_maquinas_fazenda_id ON registros_operacoes_maquinas(fazenda_id);

ALTER TABLE registros_operacoes_maquinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on registros_operacoes_maquinas"
  ON registros_operacoes_maquinas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access on registros_operacoes_maquinas"
  ON registros_operacoes_maquinas FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access on registros_operacoes_maquinas"
  ON registros_operacoes_maquinas FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete access on registros_operacoes_maquinas"
  ON registros_operacoes_maquinas FOR DELETE
  TO public
  USING (true);

ALTER TABLE registros_operacoes_maquinas ADD CONSTRAINT registros_operacoes_maquinas_fazenda_id_fkey FOREIGN KEY (fazenda_id) REFERENCES fazendas(id);
ALTER TABLE registros_operacoes_maquinas ADD CONSTRAINT registros_operacoes_maquinas_dispositivo_id_fkey FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id);;
