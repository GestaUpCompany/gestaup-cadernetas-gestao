-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver minerais da própria fazenda"
ON public.mineral
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir minerais na própria fazenda"
ON public.mineral
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar minerais da própria fazenda"
ON public.mineral
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
CREATE POLICY "Usuários podem deletar minerais da própria fazenda"
ON public.mineral
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Minerais ativos podem ser lidos"
ON public.mineral
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler minerais"
ON public.mineral
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
