
-- Temporarily create a fully permissive update policy for testing
DROP POLICY IF EXISTS "Authenticated update lotes" ON public.lotes;

CREATE POLICY "Authenticated update lotes"
ON public.lotes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
;
