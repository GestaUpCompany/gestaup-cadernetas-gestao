-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated select proteinado" ON public.proteinado;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.proteinado;
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.proteinado;
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON public.proteinado;
DROP POLICY IF EXISTS "Enable delete for all authenticated users" ON public.proteinado;
DROP POLICY IF EXISTS "Usuários podem ver proteinados da própria fazenda" ON public.proteinado;;
