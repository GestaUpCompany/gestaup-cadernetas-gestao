-- Remover campos individuais que serão substituídos por JSONB
ALTER TABLE registros_almoxarifado 
  DROP COLUMN IF EXISTS itens_entregues,
  DROP COLUMN IF EXISTS quantidade_retirada,
  DROP COLUMN IF EXISTS tipo_classificacao,
  DROP COLUMN IF EXISTS necessario_devolucao,
  DROP COLUMN IF EXISTS prazo_devolucao,
  DROP COLUMN IF EXISTS setor_entrega;

-- Adicionar coluna itens como JSONB
ALTER TABLE registros_almoxarifado 
  ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb;

-- Criar índice GIN para busca eficiente em itens
CREATE INDEX IF NOT EXISTS idx_registros_almoxarifado_itens 
  ON registros_almoxarifado USING GIN (itens);

-- Garantir permissões para anon (sem delete)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE registros_almoxarifado TO anon;
GRANT INSERT ON TABLE registros_almoxarifado TO anon;
GRANT UPDATE ON TABLE registros_almoxarifado TO anon;
-- NOTA: DELETE não é concedido conforme solicitado;
