DROP POLICY IF EXISTS formulacao_insumos_select_fazenda ON public.formulacao_insumos;

-- Alinhar com a policy de formulacoes e insumos (true para authenticated)
CREATE POLICY formulacao_insumos_select_authenticated ON public.formulacao_insumos
  FOR SELECT TO authenticated USING (true);;
