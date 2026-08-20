
-- Enable RLS on individuos table
ALTER TABLE public.individuos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated select individuos" ON public.individuos;
DROP POLICY IF EXISTS "Authenticated insert individuos" ON public.individuos;
DROP POLICY IF EXISTS "Authenticated update individuos" ON public.individuos;
DROP POLICY IF EXISTS "Authenticated delete individuos" ON public.individuos;

-- Create policies for authenticated users
CREATE POLICY "Authenticated select individuos"
  ON public.individuos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert individuos"
  ON public.individuos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update individuos"
  ON public.individuos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated delete individuos"
  ON public.individuos
  FOR DELETE
  TO authenticated
  USING (true);
;
