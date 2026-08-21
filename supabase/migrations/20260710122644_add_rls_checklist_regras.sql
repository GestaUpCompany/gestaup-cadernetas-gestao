-- Enable RLS on checklist_regras
ALTER TABLE public.checklist_regras ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated select checklist_regras" ON public.checklist_regras;
DROP POLICY IF EXISTS "Authenticated insert checklist_regras" ON public.checklist_regras;
DROP POLICY IF EXISTS "Authenticated update checklist_regras" ON public.checklist_regras;
DROP POLICY IF EXISTS "Authenticated delete checklist_regras" ON public.checklist_regras;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.checklist_regras;

-- Read access for public/anonymous users (app PWA offline sync)
CREATE POLICY "Enable read access for all users"
  ON public.checklist_regras
  FOR SELECT
  TO public
  USING (true);

-- Full access for authenticated users (web system)
CREATE POLICY "Authenticated select checklist_regras"
  ON public.checklist_regras
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert checklist_regras"
  ON public.checklist_regras
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update checklist_regras"
  ON public.checklist_regras
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated delete checklist_regras"
  ON public.checklist_regras
  FOR DELETE
  TO authenticated
  USING (true);;
