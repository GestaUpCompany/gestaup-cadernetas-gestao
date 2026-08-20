-- Política temporária para debug - permite leitura sem verificação de usuário
CREATE POLICY "Debug - permitir leitura de rações"
ON public.racao
FOR SELECT
TO anon, authenticated
USING (true);;
