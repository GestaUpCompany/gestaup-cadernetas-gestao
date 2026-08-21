-- Política para permitir leitura por usuários da fazenda
CREATE POLICY "Usuários podem ver dietas da própria fazenda"
ON public.dietas
FOR SELECT
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);;
