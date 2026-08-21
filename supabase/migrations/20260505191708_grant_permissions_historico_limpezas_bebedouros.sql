-- Conceder permissões para o papel anon
GRANT SELECT ON public.historico_limpezas_bebedouros TO anon;
GRANT INSERT ON public.historico_limpezas_bebedouros TO anon;

-- Conceder permissões para o papel authenticated
GRANT SELECT ON public.historico_limpezas_bebedouros TO authenticated;
GRANT INSERT ON public.historico_limpezas_bebedouros TO authenticated;;
