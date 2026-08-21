DROP POLICY IF EXISTS "Users can view farm maternity records" ON public.registros_maternidade;
DROP POLICY IF EXISTS "Users can manage farm maternity records" ON public.registros_maternidade;

CREATE POLICY "Users can view farm maternity records"
  ON public.registros_maternidade
  FOR SELECT
  TO authenticated
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

CREATE POLICY "Users can manage farm maternity records"
  ON public.registros_maternidade
  FOR ALL
  TO authenticated
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  )
  WITH CHECK (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );;
