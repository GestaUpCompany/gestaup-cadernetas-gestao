
-- Force drop and recreate the update policy to clear any cache issues
DROP POLICY IF EXISTS "Authenticated update lotes" ON public.lotes;

CREATE POLICY "Authenticated update lotes"
ON public.lotes
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (true);
;
