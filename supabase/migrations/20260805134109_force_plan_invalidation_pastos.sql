-- Força invalidação de planos cacheados que podem estar usando a policy antiga
ALTER TABLE public.pastos SET (parallel_workers = 0);
ALTER TABLE public.pastos RESET (parallel_workers);

NOTIFY pgrst, 'reload schema';;
