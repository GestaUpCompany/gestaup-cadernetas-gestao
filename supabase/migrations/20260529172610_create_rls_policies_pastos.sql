-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated delete pastos" ON public.pastos;
DROP POLICY IF EXISTS "Authenticated insert pastos" ON public.pastos;
DROP POLICY IF EXISTS "Authenticated select pastos" ON public.pastos;
DROP POLICY IF EXISTS "Authenticated update pastos" ON public.pastos;

-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver pastos da própria fazenda"
ON public.pastos
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir pastos na própria fazenda"
ON public.pastos
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar pastos da própria fazenda"
ON public.pastos
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
CREATE POLICY "Usuários podem deletar pastos da própria fazenda"
ON public.pastos
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Pastos ativos podem ser lidos"
ON public.pastos
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler pastos"
ON public.pastos
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
