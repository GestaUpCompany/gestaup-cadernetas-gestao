
DROP POLICY IF EXISTS "Admin select all individuos" ON public.individuos;

CREATE POLICY "Admin select all individuos"
ON public.individuos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.auth_id = auth.uid() AND u.papel = 'admin'
  )
);
;
