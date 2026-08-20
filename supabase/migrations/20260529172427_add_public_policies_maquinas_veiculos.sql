-- Add public policies to maquinas_veiculos to match funcionarios pattern
CREATE POLICY "Máquinas/veículos ativos podem ser lidos"
ON public.maquinas_veiculos
FOR SELECT
TO public
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ler máquinas/veículos"
ON public.maquinas_veiculos
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);;
