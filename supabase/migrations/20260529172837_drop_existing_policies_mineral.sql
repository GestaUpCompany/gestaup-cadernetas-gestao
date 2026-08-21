-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated select mineral" ON public.mineral;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.mineral;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.mineral;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON public.mineral;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON public.mineral;
DROP POLICY IF EXISTS "Usuários podem ver minerais da própria fazenda" ON public.mineral;;
