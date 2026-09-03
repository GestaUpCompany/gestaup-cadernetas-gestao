-- Grants de acesso para a role authenticated na tabela vagoes
GRANT SELECT ON public.vagoes TO authenticated;
GRANT INSERT ON public.vagoes TO authenticated;
GRANT UPDATE ON public.vagoes TO authenticated;
GRANT DELETE ON public.vagoes TO authenticated;
