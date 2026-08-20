GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_leitura_cocho TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_leitura_cocho TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;;
