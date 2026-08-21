DROP POLICY IF EXISTS pastos_update_active ON public.pastos;

CREATE POLICY pastos_update_public ON public.pastos
  FOR UPDATE TO PUBLIC
  USING (true)
  WITH CHECK (true);;
