-- Adicionar políticas para usuários anon na tabela fornecedores
CREATE POLICY "Enable read access for anon users"
ON public.fornecedores FOR SELECT
TO anon
USING (true);

CREATE POLICY "Enable insert for anon users"
ON public.fornecedores FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Enable update for anon users"
ON public.fornecedores FOR UPDATE
TO anon
USING (true);

CREATE POLICY "Enable delete for anon users"
ON public.fornecedores FOR DELETE
TO anon
USING (true);;
