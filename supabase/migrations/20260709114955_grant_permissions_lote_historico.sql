
-- Grant necessary permissions on lote_historico to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lote_historico TO authenticated;

-- Enable RLS on lote_historico
ALTER TABLE public.lote_historico ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too
ALTER TABLE public.lote_historico FORCE ROW LEVEL SECURITY;
;
