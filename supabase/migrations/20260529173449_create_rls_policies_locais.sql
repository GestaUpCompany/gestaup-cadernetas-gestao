-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver locais da própria fazenda"
ON public.locais
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir locais na própria fazenda"
ON public.locais
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar locais da própria fazenda"
ON public.locais
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
CREATE POLICY "Usuários podem deletar locais da própria fazenda"
ON public.locais
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Locais ativos podem ser lidos"
ON public.locais
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler locais"
ON public.locais
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
