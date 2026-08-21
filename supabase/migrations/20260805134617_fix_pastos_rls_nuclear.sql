-- DROP todas as policies existentes
DROP POLICY IF EXISTS "Authenticated select pastos" ON public.pastos;
DROP POLICY IF EXISTS "Authenticated insert pastos" ON public.pastos;
DROP POLICY IF EXISTS "Authenticated update pastos" ON public.pastos;
DROP POLICY IF EXISTS "Authenticated delete pastos" ON public.pastos;

-- Recriar com nomes novos para forçar invalidação de cache de planos
CREATE POLICY "pastos_select_active" ON public.pastos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "pastos_insert_auth" ON public.pastos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "pastos_update_active" ON public.pastos
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "pastos_delete_active" ON public.pastos
  FOR DELETE TO authenticated
  USING (deleted_at IS NULL);;
