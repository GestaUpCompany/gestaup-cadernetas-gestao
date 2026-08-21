-- Habilitar RLS na tabela
ALTER TABLE registros_abastecimento ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura registros_abastecimento"
  ON registros_abastecimento
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção registros_abastecimento"
  ON registros_abastecimento
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização registros_abastecimento"
  ON registros_abastecimento
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Política para permitir deleção lógica para usuários autenticados
CREATE POLICY "Permitir deleção lógica registros_abastecimento"
  ON registros_abastecimento
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at = NOW());;
