-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver dietas da própria fazenda"
ON public.dietas
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir dietas na própria fazenda"
ON public.dietas
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar dietas da própria fazenda"
ON public.dietas
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
CREATE POLICY "Usuários podem deletar dietas da própria fazenda"
ON public.dietas
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Dietas ativas podem ser lidas"
ON public.dietas
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler dietas"
ON public.dietas
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
