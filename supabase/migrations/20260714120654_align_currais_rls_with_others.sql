-- Alinhar políticas RLS de currais com lotes, pastos e formulacoes
DROP POLICY IF EXISTS currais_select ON public.currais;
DROP POLICY IF EXISTS currais_insert ON public.currais;
DROP POLICY IF EXISTS currais_update ON public.currais;
DROP POLICY IF EXISTS currais_delete ON public.currais;

CREATE POLICY "Authenticated select currais" ON public.currais
  FOR SELECT TO authenticated, anon
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated insert currais" ON public.currais
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Authenticated update currais" ON public.currais
  FOR UPDATE TO authenticated, anon
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Authenticated delete currais" ON public.currais
  FOR DELETE TO authenticated, anon
  USING (deleted_at IS NULL);;
