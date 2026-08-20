-- Concede INSERT e SELECT para anon e authenticated em logs_sync_errors.
-- As policies RLS já existem (INSERT com with_check=true para ambos,
-- SELECT filtrando por fazenda via usuario_fazenda para authenticated).
-- Sem estes GRANTs, as roles não tinham privilégio nem para INSERT,
-- causando erro 42501 "permission denied" ao logar falhas de sync.
GRANT INSERT, SELECT ON public.logs_sync_errors TO anon, authenticated;;
