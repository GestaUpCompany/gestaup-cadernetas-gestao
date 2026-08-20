-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated delete fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated insert fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated select fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated update fornecedores" ON public.fornecedores;

-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver fornecedores da própria fazenda"
ON public.fornecedores
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir fornecedores na própria fazenda"
ON public.fornecedores
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar fornecedores da própria fazenda"
ON public.fornecedores
FOR UPDATE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
))
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for DELETE - filter by fazenda_id
CREATE POLICY "Usuários podem deletar fornecedores da própria fazenda"
ON public.fornecedores
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Fornecedores ativos podem ser lidos"
ON public.fornecedores
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler fornecedores"
ON public.fornecedores
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
