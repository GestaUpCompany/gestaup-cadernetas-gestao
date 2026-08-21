-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated select racao" ON public.racao;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.racao;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.racao;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON public.racao;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON public.racao;;
