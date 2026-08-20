-- Criar tabela registros_abastecimento
CREATE TABLE IF NOT EXISTS registros_abastecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  
  -- Campos do formulário
  data DATE NOT NULL,
  quem_abasteceu TEXT NOT NULL,
  operador_motorista TEXT NOT NULL,
  veiculo_trator TEXT NOT NULL,
  placa TEXT NOT NULL,
  hidrometro_inicial NUMERIC NOT NULL,
  hidrometro_final NUMERIC NOT NULL,
  total_abastecido NUMERIC NOT NULL,
  combustivel TEXT NOT NULL,
  odometro TEXT NOT NULL,
  tipo_operacao TEXT NOT NULL,
  observacao TEXT,
  
  -- Campos de controle
  sync_status TEXT NOT NULL DEFAULT 'synced',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_registros_abastecimento_fazenda_id ON registros_abastecimento(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_registros_abastecimento_data ON registros_abastecimento(data);
CREATE INDEX IF NOT EXISTS idx_registros_abastecimento_deleted_at ON registros_abastecimento(deleted_at);
CREATE INDEX IF NOT EXISTS idx_registros_abastecimento_dispositivo_id ON registros_abastecimento(dispositivo_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_registros_abastecimento_updated_at ON registros_abastecimento;
CREATE TRIGGER update_registros_abastecimento_updated_at
  BEFORE UPDATE ON registros_abastecimento
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
