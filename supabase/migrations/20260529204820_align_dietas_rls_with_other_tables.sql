-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated select dietas" ON public.dietas;
DROP POLICY IF EXISTS "Authenticated insert dietas" ON public.dietas;
DROP POLICY IF EXISTS "Authenticated update dietas" ON public.dietas;
DROP POLICY IF EXISTS "Authenticated delete dietas" ON public.dietas;

-- Create new RLS policies matching pastos, lotes, mineral pattern (qual: true)
CREATE POLICY "Authenticated select dietas"
ON public.dietas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert dietas"
ON public.dietas
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update dietas"
ON public.dietas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated delete dietas"
ON public.dietas
FOR DELETE
TO authenticated
USING (true);;
