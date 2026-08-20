-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver bebedouros da própria fazenda"
ON public.bebedouros
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir bebedouros na própria fazenda"
ON public.bebedouros
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar bebedouros da própria fazenda"
ON public.bebedouros
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
CREATE POLICY "Usuários podem deletar bebedouros da própria fazenda"
ON public.bebedouros
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Bebedouros ativos podem ser lidos"
ON public.bebedouros
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler bebedouros"
ON public.bebedouros
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
