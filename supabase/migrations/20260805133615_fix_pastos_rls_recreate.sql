DROP POLICY IF EXISTS "Authenticated update pastos" ON public.pastos;

CREATE POLICY "Authenticated update pastos" ON public.pastos
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';;
