-- Drop existing policies if any
DROP POLICY IF EXISTS "Auth delete insumos" ON public.insumos;
DROP POLICY IF EXISTS "Auth insert insumos" ON public.insumos;
DROP POLICY IF EXISTS "Auth select insumos" ON public.insumos;
DROP POLICY IF EXISTS "Auth update insumos" ON public.insumos;
DROP POLICY IF EXISTS "Authenticated delete insumos" ON public.insumos;
DROP POLICY IF EXISTS "Authenticated insert insumos" ON public.insumos;
DROP POLICY IF EXISTS "Authenticated select insumos" ON public.insumos;
DROP POLICY IF EXISTS "Authenticated update insumos" ON public.insumos;
DROP POLICY IF EXISTS "Usuários podem ver insumos da própria fazenda" ON public.insumos;

-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver insumos da própria fazenda"
ON public.insumos
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir insumos na própria fazenda"
ON public.insumos
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar insumos da própria fazenda"
ON public.insumos
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
CREATE POLICY "Usuários podem deletar insumos da própria fazenda"
ON public.insumos
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Add public policies
CREATE POLICY "Insumos ativos podem ser lidos"
ON public.insumos
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler insumos"
ON public.insumos
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
