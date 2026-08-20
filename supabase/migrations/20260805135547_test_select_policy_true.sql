DROP POLICY IF EXISTS pastos_select_active ON public.pastos;

CREATE POLICY pastos_select_active ON public.pastos
  FOR SELECT TO authenticated
  USING (true);;
