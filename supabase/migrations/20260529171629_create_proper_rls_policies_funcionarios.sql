-- Drop existing policies
DROP POLICY IF EXISTS "Funcionários podem ser lidos por usuários autenticados" ON public.funcionarios;
DROP POLICY IF EXISTS "Funcionários podem ser inseridos por usuários autenticados" ON public.funcionarios;
DROP POLICY IF EXISTS "Funcionários podem ser atualizados por usuários autenticados" ON public.funcionarios;
DROP POLICY IF EXISTS "Funcionários podem ser deletados por usuários autenticados" ON public.funcionarios;

-- Create proper policy for SELECT (read access) - filter by fazenda_id
CREATE POLICY "Usuários podem ver funcionários da própria fazenda"
ON public.funcionarios
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for INSERT - filter by fazenda_id
CREATE POLICY "Usuários podem inserir funcionários na própria fazenda"
ON public.funcionarios
FOR INSERT
TO authenticated
WITH CHECK (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));

-- Create policy for UPDATE - filter by fazenda_id
CREATE POLICY "Usuários podem atualizar funcionários da própria fazenda"
ON public.funcionarios
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
CREATE POLICY "Usuários podem deletar funcionários da própria fazenda"
ON public.funcionarios
FOR DELETE
TO authenticated
USING (fazenda_id IN (
  SELECT fazenda_id 
  FROM public.usuario_fazenda 
  WHERE usuario_id = auth.uid()
));;
