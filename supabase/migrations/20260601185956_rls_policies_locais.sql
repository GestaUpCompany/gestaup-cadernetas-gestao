-- Enable RLS
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;

-- Create simple policies like pastos (allow all authenticated users)
CREATE POLICY "Authenticated select locais"
ON public.locais FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert locais"
ON public.locais FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update locais"
ON public.locais FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated delete locais"
ON public.locais FOR DELETE
TO authenticated
USING (true);;
