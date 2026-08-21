-- Política para permitir leitura anônima de fazendas para validação de acesso_id
CREATE POLICY "Public read fazendas by acesso_id"
ON fazendas
FOR SELECT
TO anon
USING (ativo = true);;
