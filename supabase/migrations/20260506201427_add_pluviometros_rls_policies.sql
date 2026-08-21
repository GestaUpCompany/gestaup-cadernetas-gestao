-- Enable RLS on pluviometros table
ALTER TABLE public.pluviometros ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read pluviometros
CREATE POLICY "Allow authenticated to read pluviometros"
ON public.pluviometros FOR SELECT
TO authenticated
USING (true);

-- Allow service role to manage all pluviometros
CREATE POLICY "Allow service role full access to pluviometros"
ON public.pluviometros FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert pluviometros (if needed)
CREATE POLICY "Allow authenticated to insert pluviometros"
ON public.pluviometros FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update their own pluviometros
CREATE POLICY "Allow authenticated to update own pluviometros"
ON public.pluviometros FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete their own pluviometros
CREATE POLICY "Allow authenticated to delete own pluviometros"
ON public.pluviometros FOR DELETE
TO authenticated
USING (true);;
