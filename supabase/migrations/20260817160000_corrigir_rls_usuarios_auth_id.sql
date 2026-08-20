CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO public AS $$ SELECT EXISTS (SELECT 1 FROM public.usuarios u WHERE (u.id = auth.uid() OR u.auth_id = auth.uid()) AND u.papel IN ('admin', 'super_admin') AND u.ativo = true); $$;;
DROP POLICY IF EXISTS "Users can view own profile" ON public.usuarios;;
CREATE POLICY "Users can view own profile" ON public.usuarios FOR SELECT TO authenticated USING (id = auth.uid() OR auth_id = auth.uid());;
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuarios;;
CREATE POLICY "Users can update own profile" ON public.usuarios FOR UPDATE TO authenticated USING (id = auth.uid() OR auth_id = auth.uid());;
