-- Enable RLS
ALTER TABLE public.implementos ENABLE ROW LEVEL SECURITY;

-- Create simple policies like pastos (allow all authenticated users)
CREATE POLICY "Authenticated select implementos"
ON public.implementos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert implementos"
ON public.implementos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update implementos"
ON public.implementos FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated delete implementos"
ON public.implementos FOR DELETE
TO authenticated
USING (true);;
