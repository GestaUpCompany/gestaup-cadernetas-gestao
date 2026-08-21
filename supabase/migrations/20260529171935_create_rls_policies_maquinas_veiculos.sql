-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated delete maquinas_veiculos" ON public.maquinas_veiculos;
DROP POLICY IF EXISTS "Authenticated insert maquinas_veiculos" ON public.maquinas_veiculos;
DROP POLICY IF EXISTS "Authenticated select maquinas_veiculos" ON public.maquinas_veiculos;
DROP POLICY IF EXISTS "Authenticated update maquinas_veiculos" ON public.maquinas_veiculos;

-- Create policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver máquinas/veículos da própria fazenda"
ON public.maquinas_veiculos
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir máquinas/veículos na própria fazenda"
ON public.maquinas_veiculos
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar máquinas/veículos da própria fazenda"
ON public.maquinas_veiculos
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
CREATE POLICY "Usuários podem deletar máquinas/veículos da própria fazenda"
ON public.maquinas_veiculos
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));;
