-- Política para permitir leitura por usuários anônimos (para desenvolvimento)
CREATE POLICY "Anon pode ver minerais da própria fazenda"
ON public.mineral
FOR SELECT
TO anon
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);;
