CREATE TABLE IF NOT EXISTS public.chat_ia_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pergunta text NOT NULL,
  resposta text,
  funcoes_chamadas jsonb,
  modelo text,
  tokens_input integer,
  tokens_output integer,
  custo_estimado_usd numeric(10,6),
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_ia_logs_fazenda_id ON public.chat_ia_logs (fazenda_id);
CREATE INDEX IF NOT EXISTS idx_chat_ia_logs_usuario_id ON public.chat_ia_logs (usuario_id);
CREATE INDEX IF NOT EXISTS idx_chat_ia_logs_created_at ON public.chat_ia_logs (created_at DESC);

ALTER TABLE public.chat_ia_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_ia_logs_select_own_fazenda" ON public.chat_ia_logs;
CREATE POLICY "chat_ia_logs_select_own_fazenda"
  ON public.chat_ia_logs FOR SELECT
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id FROM public.usuario_fazenda uf
      WHERE uf.usuario_id = auth.uid() AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "chat_ia_logs_insert_own_fazenda" ON public.chat_ia_logs;
CREATE POLICY "chat_ia_logs_insert_own_fazenda"
  ON public.chat_ia_logs FOR INSERT
  WITH CHECK (
    fazenda_id IN (
      SELECT uf.fazenda_id FROM public.usuario_fazenda uf
      WHERE uf.usuario_id = auth.uid() AND uf.ativo = true
    )
    AND usuario_id = auth.uid()
  );

COMMENT ON TABLE public.chat_ia_logs IS
  'Logs do prototipo de assistente de IA. Prototipo restrito a fazenda de testes d649c65e-16ab-4b77-a84b-df937aa41cc3 via hard-code na Edge Function.';;
