-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver proteinados da própria fazenda"
ON public.proteinado
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir proteinados na própria fazenda"
ON public.proteinado
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar proteinados da própria fazenda"
ON public.proteinado
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
CREATE POLICY "Usuários podem deletar proteinados da própria fazenda"
ON public.proteinado
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Proteinados ativos podem ser lidos"
ON public.proteinado
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler proteinados"
ON public.proteinado
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
