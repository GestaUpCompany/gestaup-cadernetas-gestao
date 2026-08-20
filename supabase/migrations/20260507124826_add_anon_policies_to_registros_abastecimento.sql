-- Adicionar políticas para o role anon também
DROP POLICY IF EXISTS "Permitir leitura registros_abastecimento" ON registros_abastecimento;
DROP POLICY IF EXISTS "Permitir inserção registros_abastecimento" ON registros_abastecimento;
DROP POLICY IF EXISTS "Permitir atualização registros_abastecimento" ON registros_abastecimento;
DROP POLICY IF EXISTS "Permitir deleção lógica registros_abastecimento" ON registros_abastecimento;

-- Políticas para anon (sem autenticação)
CREATE POLICY "Permitir leitura registros_abastecimento anon"
  ON registros_abastecimento
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Permitir inserção registros_abastecimento anon"
  ON registros_abastecimento
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização registros_abastecimento anon"
  ON registros_abastecimento
  FOR UPDATE
  TO anon, authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Permitir deleção lógica registros_abastecimento anon"
  ON registros_abastecimento
  FOR UPDATE
  TO anon, authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at = NOW());;
