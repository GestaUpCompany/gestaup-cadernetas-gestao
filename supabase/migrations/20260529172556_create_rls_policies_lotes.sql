-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated delete lotes" ON public.lotes;
DROP POLICY IF EXISTS "Authenticated insert lotes" ON public.lotes;
DROP POLICY IF EXISTS "Authenticated select lotes" ON public.lotes;
DROP POLICY IF EXISTS "Authenticated update lotes" ON public.lotes;

-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver lotes da própria fazenda"
ON public.lotes
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir lotes na própria fazenda"
ON public.lotes
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar lotes da própria fazenda"
ON public.lotes
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
CREATE POLICY "Usuários podem deletar lotes da própria fazenda"
ON public.lotes
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Lotes ativos podem ser lidos"
ON public.lotes
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler lotes"
ON public.lotes
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
