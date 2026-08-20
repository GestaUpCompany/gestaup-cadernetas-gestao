-- Adicionar políticas para usuários anon na tabela frigorificos
CREATE POLICY "Enable read access for anon users"
ON public.frigorificos FOR SELECT
TO anon
USING (true);

CREATE POLICY "Enable insert for anon users"
ON public.frigorificos FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Enable update for anon users"
ON public.frigorificos FOR UPDATE
TO anon
USING (true);

CREATE POLICY "Enable delete for anon users"
ON public.frigorificos FOR DELETE
TO anon
USING (true);;
