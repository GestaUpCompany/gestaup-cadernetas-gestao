-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated delete peoes" ON public.peoes;
DROP POLICY IF EXISTS "Authenticated insert peoes" ON public.peoes;
DROP POLICY IF EXISTS "Authenticated select peoes" ON public.peoes;
DROP POLICY IF EXISTS "Authenticated update peoes" ON public.peoes;

-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver peões da própria fazenda"
ON public.peoes
FOR SELECT
TO authenticated
USING (fazenda_id::text IN (
  SELECT fazenda_id::text 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir peões na própria fazenda"
ON public.peoes
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id::text IN (
  SELECT fazenda_id::text 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar peões da própria fazenda"
ON public.peoes
FOR UPDATE
TO authenticated
USING (fazenda_id::text IN (
  SELECT fazenda_id::text 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
))
WITH CHECK (fazenda_id::text IN (
  SELECT fazenda_id::text 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for DELETE - filter by fazenda_id
CREATE POLICY "Usuários podem deletar peões da própria fazenda"
ON public.peoes
FOR DELETE
TO authenticated
USING (fazenda_id::text IN (
  SELECT fazenda_id::text 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Peões ativos podem ser lidos"
ON public.peoes
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler peões"
ON public.peoes
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
