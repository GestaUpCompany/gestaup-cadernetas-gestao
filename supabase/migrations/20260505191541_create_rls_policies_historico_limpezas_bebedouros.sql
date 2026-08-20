-- Política para permitir leitura por usuários da fazenda
CREATE POLICY "Usuários podem ver histórico de limpezas da própria fazenda"
ON public.historico_limpezas_bebedouros
FOR SELECT
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

-- Política para permitir inserção por usuários da fazenda
CREATE POLICY "Usuários podem inserir histórico de limpezas na própria fazenda"
ON public.historico_limpezas_bebedouros
FOR INSERT
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);;
