REVOKE SELECT ON public.v_registros_unificado FROM authenticated, anon;

-- Opcional: garantir que nem mesmo via Supabase SQL editor um usuario anon/autenticado leia a view diretamente.
-- Os 3 RPCs (get_rastreio_usuarios, get_rastreio_cadernetas, get_rastreio_cadernetas_detalhe) sao SECURITY DEFINER
-- e filtram por p_fazenda_id obrigatoriamente, entao eles continuam funcionando.;
