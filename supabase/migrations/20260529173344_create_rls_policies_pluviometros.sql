-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver pluviômetros da própria fazenda"
ON public.pluviometros
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir pluviômetros na própria fazenda"
ON public.pluviometros
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar pluviômetros da própria fazenda"
ON public.pluviometros
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
CREATE POLICY "Usuários podem deletar pluviômetros da própria fazenda"
ON public.pluviometros
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Pluviômetros ativos podem ser lidos"
ON public.pluviometros
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler pluviômetros"
ON public.pluviometros
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
