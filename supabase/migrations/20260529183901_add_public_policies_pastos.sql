-- Add public policies for pastos
CREATE POLICY "Pastos ativos podem ser lidos"
ON public.pastos
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler pastos"
ON public.pastos
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
