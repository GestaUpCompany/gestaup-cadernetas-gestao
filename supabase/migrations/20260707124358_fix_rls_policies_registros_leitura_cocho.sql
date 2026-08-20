DROP POLICY IF EXISTS "Users can manage farm leitura cocho records" ON public.registros_leitura_cocho;
DROP POLICY IF EXISTS "Users can view farm leitura cocho records" ON public.registros_leitura_cocho;

CREATE POLICY "Users can manage farm leitura cocho records"
  ON public.registros_leitura_cocho
  FOR ALL
  TO authenticated
  USING (
    fazenda_id IN (
      SELECT usuario_fazenda.fazenda_id
      FROM usuario_fazenda
      WHERE usuario_fazenda.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    fazenda_id IN (
      SELECT usuario_fazenda.fazenda_id
      FROM usuario_fazenda
      WHERE usuario_fazenda.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Users can view farm leitura cocho records"
  ON public.registros_leitura_cocho
  FOR SELECT
  TO authenticated
  USING (
    fazenda_id IN (
      SELECT usuario_fazenda.fazenda_id
      FROM usuario_fazenda
      WHERE usuario_fazenda.usuario_id = auth.uid()
    )
  );;
