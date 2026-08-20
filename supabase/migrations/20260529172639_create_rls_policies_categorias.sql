-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated delete categorias" ON public.categorias;
DROP POLICY IF EXISTS "Authenticated insert categorias" ON public.categorias;
DROP POLICY IF EXISTS "Authenticated select categorias" ON public.categorias;
DROP POLICY IF EXISTS "Authenticated update categorias" ON public.categorias;

-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver categorias da própria fazenda"
ON public.categorias
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir categorias na própria fazenda"
ON public.categorias
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar categorias da própria fazenda"
ON public.categorias
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
CREATE POLICY "Usuários podem deletar categorias da própria fazenda"
ON public.categorias
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Categorias ativas podem ser lidas"
ON public.categorias
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler categorias"
ON public.categorias
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
