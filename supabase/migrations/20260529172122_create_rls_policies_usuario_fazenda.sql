-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated select usuario_fazenda" ON public.usuario_fazenda;
DROP POLICY IF EXISTS "Authenticated insert usuario_fazenda" ON public.usuario_fazenda;
DROP POLICY IF EXISTS "Authenticated update usuario_fazenda" ON public.usuario_fazenda;
DROP POLICY IF EXISTS "Authenticated delete usuario_fazenda" ON public.usuario_fazenda;

-- Create policy for SELECT - users can see their own fazenda associations
CREATE POLICY "Usuários podem ver suas próprias associações de fazenda"
ON public.usuario_fazenda
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

-- Create policy for INSERT - users can insert their own fazenda associations
CREATE POLICY "Usuários podem inserir suas próprias associações de fazenda"
ON public.usuario_fazenda
FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- Create policy for UPDATE - users can update their own fazenda associations
CREATE POLICY "Usuários podem atualizar suas próprias associações de fazenda"
ON public.usuario_fazenda
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

-- Create policy for DELETE - users can delete their own fazenda associations
CREATE POLICY "Usuários podem deletar suas próprias associações de fazenda"
ON public.usuario_fazenda
FOR DELETE
TO authenticated
USING (usuario_id = auth.uid());;
