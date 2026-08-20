-- Política temporária para debug - permite leitura sem verificação de usuário
CREATE POLICY "Debug - permitir leitura de minerais"
ON public.mineral
FOR SELECT
TO anon, authenticated
USING (true);;
