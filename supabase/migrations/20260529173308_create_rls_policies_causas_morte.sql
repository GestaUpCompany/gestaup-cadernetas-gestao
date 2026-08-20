-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver causas de morte da própria fazenda"
ON public.causas_morte
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir causas de morte na própria fazenda"
ON public.causas_morte
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar causas de morte da própria fazenda"
ON public.causas_morte
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
CREATE POLICY "Usuários podem deletar causas de morte da própria fazenda"
ON public.causas_morte
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Causas de morte ativas podem ser lidas"
ON public.causas_morte
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler causas de morte"
ON public.causas_morte
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
