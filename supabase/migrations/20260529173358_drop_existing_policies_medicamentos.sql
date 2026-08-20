-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated delete medicamentos" ON public.medicamentos;
DROP POLICY IF EXISTS "Authenticated insert medicamentos" ON public.medicamentos;
DROP POLICY IF EXISTS "Authenticated select medicamentos" ON public.medicamentos;
DROP POLICY IF EXISTS "Authenticated update medicamentos" ON public.medicamentos;;
