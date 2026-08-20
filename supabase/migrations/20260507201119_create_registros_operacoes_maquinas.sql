-- Criar tabela registros_operacoes_maquinas
CREATE TABLE IF NOT EXISTS registros_operacoes_maquinas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
  fazenda TEXT,
  usuario TEXT,
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_registros_operacoes_maquinas_sync_status ON registros_operacoes_maquinas(sync_status);
CREATE INDEX IF NOT EXISTS idx_registros_operacoes_maquinas_data ON registros_operacoes_maquinas(data);
CREATE INDEX IF NOT EXISTS idx_registros_operacoes_maquinas_fazenda ON registros_operacoes_maquinas(fazenda);

-- Habilitar RLS
ALTER TABLE registros_operacoes_maquinas ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Allow public read access on registros_operacoes_maquinas"
  ON registros_operacoes_maquinas FOR SELECT
  TO public
  USING (true);

-- Política para permitir inserção pública
CREATE POLICY "Allow public insert access on registros_operacoes_maquinas"
  ON registros_operacoes_maquinas FOR INSERT
  TO public
  WITH CHECK (true);

-- Política para permitir atualização pública
CREATE POLICY "Allow public update access on registros_operacoes_maquinas"
  ON registros_operacoes_maquinas FOR UPDATE
  TO public
  USING (true);

-- Política para permitir deleção pública
CREATE POLICY "Allow public delete access on registros_operacoes_maquinas"
  ON registros_operacoes_maquinas FOR DELETE
  TO public
  USING (true);;
