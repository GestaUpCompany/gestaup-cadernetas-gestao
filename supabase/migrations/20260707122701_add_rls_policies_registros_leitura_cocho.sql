-- Garante que RLS está habilitado
ALTER TABLE public.registros_leitura_cocho ENABLE ROW LEVEL SECURITY;

-- Remove políticas existentes para evitar duplicatas
DROP POLICY IF EXISTS "Users can manage farm leitura cocho records" ON public.registros_leitura_cocho;
DROP POLICY IF EXISTS "Users can view farm leitura cocho records" ON public.registros_leitura_cocho;

-- Política de gerenciamento (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage farm leitura cocho records"
  ON public.registros_leitura_cocho
  FOR ALL
  TO authenticated
  USING (
    fazenda_id IN (
      SELECT usuario_fazenda.fazenda_id
      FROM public.usuario_fazenda
      WHERE usuario_fazenda.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    fazenda_id IN (
      SELECT usuario_fazenda.fazenda_id
      FROM public.usuario_fazenda
      WHERE usuario_fazenda.usuario_id = auth.uid()
    )
  );

-- Política de leitura (SELECT)
CREATE POLICY "Users can view farm leitura cocho records"
  ON public.registros_leitura_cocho
  FOR SELECT
  TO authenticated
  USING (
    fazenda_id IN (
      SELECT usuario_fazenda.fazenda_id
      FROM public.usuario_fazenda
      WHERE usuario_fazenda.usuario_id = auth.uid()
    )
  );;
