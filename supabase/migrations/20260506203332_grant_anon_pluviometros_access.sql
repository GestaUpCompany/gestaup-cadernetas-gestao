-- Grant SELECT permission to anon role
GRANT SELECT ON public.pluviometros TO anon;

-- Also grant to authenticated role
GRANT SELECT ON public.pluviometros TO authenticated;

-- Grant usage on the sequence if exists
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;;
