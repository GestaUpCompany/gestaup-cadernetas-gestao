-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver medicamentos da própria fazenda"
ON public.medicamentos
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir medicamentos na própria fazenda"
ON public.medicamentos
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar medicamentos da própria fazenda"
ON public.medicamentos
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
CREATE POLICY "Usuários podem deletar medicamentos da própria fazenda"
ON public.medicamentos
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Medicamentos ativos podem ser lidos"
ON public.medicamentos
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler medicamentos"
ON public.medicamentos
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
