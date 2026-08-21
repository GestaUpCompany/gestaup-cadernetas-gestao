DROP POLICY IF EXISTS currais_insert ON public.currais;

CREATE POLICY currais_insert ON public.currais
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );;
