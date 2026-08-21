-- Garantir grants para authenticated e anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formulacao_insumos TO authenticated, anon;

-- Recriar policies alinhadas com formulacoes e insumos (USING true para authenticated)
DROP POLICY IF EXISTS formulacao_insumos_select_authenticated ON public.formulacao_insumos;
DROP POLICY IF EXISTS formulacao_insumos_select_fazenda ON public.formulacao_insumos;
DROP POLICY IF EXISTS formulacao_insumos_insert_fazenda ON public.formulacao_insumos;
DROP POLICY IF EXISTS formulacao_insumos_update_fazenda ON public.formulacao_insumos;
DROP POLICY IF EXISTS formulacao_insumos_delete_fazenda ON public.formulacao_insumos;

CREATE POLICY formulacao_insumos_select_authenticated ON public.formulacao_insumos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY formulacao_insumos_insert_authenticated ON public.formulacao_insumos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY formulacao_insumos_update_authenticated ON public.formulacao_insumos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY formulacao_insumos_delete_authenticated ON public.formulacao_insumos
  FOR DELETE TO authenticated USING (true);;
