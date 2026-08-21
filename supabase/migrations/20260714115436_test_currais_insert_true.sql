DROP POLICY IF EXISTS currais_insert ON public.currais;

CREATE POLICY currais_insert ON public.currais
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);;
