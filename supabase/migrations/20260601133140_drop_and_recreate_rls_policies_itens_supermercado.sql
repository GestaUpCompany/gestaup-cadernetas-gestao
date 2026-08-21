-- Drop existing policies
DROP POLICY IF EXISTS "Users can view itens_supermercado from their fazenda" ON public.itens_supermercado;
DROP POLICY IF EXISTS "Users can insert itens_supermercado for their fazenda" ON public.itens_supermercado;
DROP POLICY IF EXISTS "Users can update itens_supermercado from their fazenda" ON public.itens_supermercado;
DROP POLICY IF EXISTS "Users can delete itens_supermercado from their fazenda" ON public.itens_supermercado;

-- Create simple policies like pastos (allow all authenticated users)
CREATE POLICY "Authenticated select itens_supermercado"
ON public.itens_supermercado FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert itens_supermercado"
ON public.itens_supermercado FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update itens_supermercado"
ON public.itens_supermercado FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated delete itens_supermercado"
ON public.itens_supermercado FOR DELETE
TO authenticated
USING (true);;
