-- Garantir que o role possa usar as políticas
GRANT SELECT ON public.usuario_fazenda TO authenticated;
GRANT SELECT ON public.usuario_fazenda TO anon;

-- Remover políticas antigas de currais
DROP POLICY IF EXISTS currais_select ON public.currais;
DROP POLICY IF EXISTS currais_insert ON public.currais;
DROP POLICY IF EXISTS currais_update ON public.currais;
DROP POLICY IF EXISTS currais_delete ON public.currais;

-- Recriar políticas simplificadas
CREATE POLICY currais_select ON public.currais
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY currais_insert ON public.currais
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    auth.uid() IN (
      SELECT usuario_id FROM public.usuario_fazenda
      WHERE fazenda_id = currais.fazenda_id AND ativo = true
    )
  );

CREATE POLICY currais_update ON public.currais
  FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY currais_delete ON public.currais
  FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = currais.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );;
