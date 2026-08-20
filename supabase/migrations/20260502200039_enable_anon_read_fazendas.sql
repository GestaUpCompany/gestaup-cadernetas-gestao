-- Política para permitir leitura anônima de fazendas
DROP POLICY IF EXISTS "Public read fazendas by acesso_id" ON fazendas;
CREATE POLICY "Public read fazendas by acesso_id"
ON fazendas
FOR SELECT
TO anon
USING (ativo = true);;
