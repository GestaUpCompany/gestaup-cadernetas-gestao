-- Add public policies for lotes
CREATE POLICY "Lotes ativos podem ser lidos"
ON public.lotes
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler lotes"
ON public.lotes
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
