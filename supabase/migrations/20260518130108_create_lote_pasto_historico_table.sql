-- Criar tabela para histórico de movimentação entre pastos
CREATE TABLE IF NOT EXISTS lote_pasto_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid REFERENCES lotes(id) ON DELETE CASCADE,
  pasto_id uuid REFERENCES pastos(id),
  data_inicial date NOT NULL DEFAULT CURRENT_DATE,
  data_final date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_lote_pasto_historico_lote_id ON lote_pasto_historico(lote_id);
CREATE INDEX IF NOT EXISTS idx_lote_pasto_historico_pasto_id ON lote_pasto_historico(pasto_id);
CREATE INDEX IF NOT EXISTS idx_lote_pasto_historico_data_final ON lote_pasto_historico(data_final) WHERE data_final IS NULL;;
