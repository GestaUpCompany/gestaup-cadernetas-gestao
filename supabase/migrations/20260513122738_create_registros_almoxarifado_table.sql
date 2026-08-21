-- Criar tabela de registros de almoxarifado
CREATE TABLE IF NOT EXISTS registros_almoxarifado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id TEXT NOT NULL,
  dispositivo_id TEXT,
  nome_usuario TEXT,
  
  -- Campos específicos do almoxarifado
  data DATE NOT NULL,
  quem_entregou TEXT,
  quem_pegou TEXT,
  itens_entregues TEXT,
  quantidade_retirada TEXT,
  tipo_classificacao TEXT,
  necessario_devolucao TEXT,
  prazo_devolucao TEXT,
  setor TEXT,
  observacao TEXT,
  
  -- Metadados
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_almoxarifado_fazenda ON registros_almoxarifado(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_almoxarifado_data ON registros_almoxarifado(data);
CREATE INDEX IF NOT EXISTS idx_almoxarifado_sync_status ON registros_almoxarifado(sync_status);

-- Dar permissões para anon (sem RLS)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE registros_almoxarifado TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Habilitar RLS para o schema (mas não para esta tabela específica)
-- ALTER TABLE registros_almoxarifado ENABLE ROW LEVEL SECURITY;;
