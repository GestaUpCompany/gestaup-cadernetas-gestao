-- Política temporária para debug - permite leitura sem verificação de usuário
CREATE POLICY "Debug - permitir leitura de dietas"
ON public.dietas
FOR SELECT
TO anon, authenticated
USING (true);;
