
-- Grant SELECT nas views de ocupação para roles authenticated e anon
GRANT SELECT ON public.v_lote_pasto_ocupacao_atual TO authenticated, anon;
GRANT SELECT ON public.v_lote_modulo_ocupacao_atual TO authenticated, anon;
GRANT SELECT ON public.v_historico_ocupacao_pasto TO authenticated, anon;
GRANT SELECT ON public.v_historico_ocupacao_modulo TO authenticated, anon;
GRANT SELECT ON public.v_notificacoes_pendentes_ocupacao TO authenticated, anon;

-- Grant SELECT na tabela lote_modulo_historico (estava faltando)
GRANT SELECT, INSERT, UPDATE ON public.lote_modulo_historico TO authenticated;
GRANT SELECT ON public.lote_modulo_historico TO anon;

-- Habilitar RLS nas views não é suportado diretamente — as views herdam
-- as policies das tabelas base quando consultadas como SECURITY INVOKER (padrão).
-- Adicionar policies SELECT nas tabelas base se ainda não existirem.

-- lote_pasto_historico: já tem SELECT para anon/authenticated via grant, mas precisa de policy RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lote_pasto_historico' AND policyname = 'lote_pasto_historico_select_policy'
  ) THEN
    ALTER TABLE public.lote_pasto_historico ENABLE ROW LEVEL SECURITY;
    CREATE POLICY lote_pasto_historico_select_policy ON public.lote_pasto_historico
      FOR SELECT USING (true);
  END IF;
END $$;

-- lote_modulo_historico: habilitar RLS e policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lote_modulo_historico' AND policyname = 'lote_modulo_historico_select_policy'
  ) THEN
    ALTER TABLE public.lote_modulo_historico ENABLE ROW LEVEL SECURITY;
    CREATE POLICY lote_modulo_historico_select_policy ON public.lote_modulo_historico
      FOR SELECT USING (true);
  END IF;
END $$;
;
