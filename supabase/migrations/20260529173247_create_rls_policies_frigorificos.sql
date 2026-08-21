-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver frigoríficos da própria fazenda"
ON public.frigorificos
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir frigoríficos na própria fazenda"
ON public.frigorificos
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar frigoríficos da própria fazenda"
ON public.frigorificos
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
CREATE POLICY "Usuários podem deletar frigoríficos da própria fazenda"
ON public.frigorificos
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Frigoríficos ativos podem ser lidos"
ON public.frigorificos
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler frigoríficos"
ON public.frigorificos
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
