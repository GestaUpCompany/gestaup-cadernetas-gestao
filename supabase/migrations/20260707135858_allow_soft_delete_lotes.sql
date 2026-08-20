
-- Drop existing update policy for lotes
DROP POLICY IF EXISTS "Authenticated update lotes" ON public.lotes;

-- Recreate update policy allowing soft delete (setting deleted_at) on non-deleted rows
CREATE POLICY "Authenticated update lotes"
ON public.lotes
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (true);
;
