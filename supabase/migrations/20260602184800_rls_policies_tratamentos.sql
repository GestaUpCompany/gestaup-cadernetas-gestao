-- Enable RLS
ALTER TABLE public.tratamentos ENABLE ROW LEVEL SECURITY;

-- Create simple policies like pastos (allow all authenticated users)
CREATE POLICY "Authenticated select tratamentos"
ON public.tratamentos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert tratamentos"
ON public.tratamentos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update tratamentos"
ON public.tratamentos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated delete tratamentos"
ON public.tratamentos FOR DELETE
TO authenticated
USING (true);;
