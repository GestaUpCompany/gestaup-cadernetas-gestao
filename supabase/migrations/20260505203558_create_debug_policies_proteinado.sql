-- Política temporária para debug - permite leitura sem verificação de usuário
CREATE POLICY "Debug - permitir leitura de proteinados"
ON public.proteinado
FOR SELECT
TO anon, authenticated
USING (true);;
