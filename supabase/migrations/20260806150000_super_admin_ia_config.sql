-- Migration: Adiciona papel super_admin, tabela ia_fazenda_config, e backfill de custo_estimado_usd
--
-- 1. Adiciona 'super_admin' ao CHECK constraint de usuarios.papel
-- 2. Cria tabela ia_fazenda_config para controlar quais fazendas têm acesso à IA
--    e o limite diário de perguntas por fazenda
-- 3. Faz backfill de custo_estimado_usd nos logs existentes de chat_ia_logs
-- 4. Cria RPC para consultar uso da IA por fazenda (para o painel de monitoramento)

-- ---------------------------------------------------------------------------
-- 1. Adicionar super_admin ao CHECK constraint
-- ---------------------------------------------------------------------------
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_papel_check
  CHECK (papel = ANY (ARRAY['admin'::text, 'super_admin'::text, 'controller'::text]));

-- ---------------------------------------------------------------------------
-- 1b. Atualizar current_user_has_access() para reconhecer super_admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_has_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
  select
    exists (
      select 1
      from usuarios u
      where (u.auth_id = auth.uid() or u.id = auth.uid())
        and coalesce(u.ativo, false) = true
        and (
          u.papel in ('admin', 'super_admin')
          or exists (
            select 1
            from usuario_fazenda uf
            join fazendas f on f.id = uf.fazenda_id
            where uf.usuario_id = u.id
              and coalesce(uf.ativo, false) = true
              and coalesce(f.ativo, false) = true
          )
        )
    )
    or exists (
      select 1
      from peoes p
      join fazendas f on f.acesso_id = p.fazenda_id
      where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and coalesce(p.ativo, false) = true
        and coalesce(f.ativo, false) = true
    );
$function$;

-- ---------------------------------------------------------------------------
-- 2. Tabela ia_config_global (cotação USD->BRL e futuros settings globais)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ia_config_global (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cotacao_usd_brl numeric NOT NULL DEFAULT 5.50 CHECK (cotacao_usd_brl > 0),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_config_global ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ia_config_global_super_admin_all ON public.ia_config_global;
CREATE POLICY ia_config_global_super_admin_all ON public.ia_config_global
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.papel = 'super_admin')
  );

DROP POLICY IF EXISTS ia_config_global_admin_read ON public.ia_config_global;
CREATE POLICY ia_config_global_admin_read ON public.ia_config_global
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.papel IN ('admin', 'super_admin'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_config_global TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_fazenda_config TO authenticated;

-- Controller pode ler apenas a config da fazenda à qual está vinculado (para mostrar/esconder menu de IA).
CREATE POLICY ia_fazenda_config_controller_read ON public.ia_fazenda_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      JOIN public.usuario_fazenda uf ON uf.usuario_id = u.id
      WHERE (u.auth_id = auth.uid() OR u.id = auth.uid())
        AND u.papel = 'controller'
        AND coalesce(u.ativo, false) = true
        AND uf.fazenda_id = ia_fazenda_config.fazenda_id
    )
  );

INSERT INTO public.ia_config_global (id, cotacao_usd_brl) VALUES (1, 5.50) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_ia_config_global_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ia_config_global_updated ON public.ia_config_global;
CREATE TRIGGER trg_ia_config_global_updated
  BEFORE UPDATE ON public.ia_config_global
  FOR EACH ROW EXECUTE FUNCTION public.update_ia_config_global_timestamp();

-- ---------------------------------------------------------------------------
-- 3. Tabela ia_fazenda_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ia_fazenda_config (
  fazenda_id uuid PRIMARY KEY REFERENCES public.fazendas(id) ON DELETE CASCADE,
  ia_ativo boolean NOT NULL DEFAULT false,
  limite_diario integer NOT NULL DEFAULT 20 CHECK (limite_diario >= 0 AND limite_diario <= 1000),
  -- Pricing do Gemini em USD por 1M de tokens (ajustável pelo super admin)
  custo_input_por_mil numeric NOT NULL DEFAULT 0.075,
  custo_output_por_mil numeric NOT NULL DEFAULT 0.30,
  custo_cached_por_mil numeric NOT NULL DEFAULT 0.01875, -- 25% do input (implicit cache)
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_fazenda_config ENABLE ROW LEVEL SECURITY;

-- super_admin pode tudo; admin pode ler; controller não acessa
CREATE POLICY ia_fazenda_config_super_admin_all ON public.ia_fazenda_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.papel = 'super_admin')
  );

CREATE POLICY ia_fazenda_config_admin_read ON public.ia_fazenda_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.papel IN ('admin', 'super_admin'))
  );

-- A Edge Function usa service_role (bypass RLS), então não precisa de policy para ela.

-- ---------------------------------------------------------------------------
-- 3. Backfill de custo_estimado_usd nos logs existentes
-- ---------------------------------------------------------------------------
-- Pricing: $0.075/M input, $0.30/M output, $0.01875/M cached (25% do input)
UPDATE public.chat_ia_logs
SET custo_estimado_usd = (
  (COALESCE(tokens_input, 0) - COALESCE(tokens_cached, 0)) * 0.075 / 1000000.0
  + COALESCE(tokens_output, 0) * 0.30 / 1000000.0
  + COALESCE(tokens_cached, 0) * 0.01875 / 1000000.0
)
WHERE custo_estimado_usd IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Trigger para atualizar atualizado_em
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_ia_fazenda_config_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ia_fazenda_config_updated ON public.ia_fazenda_config;
CREATE TRIGGER trg_ia_fazenda_config_updated
  BEFORE UPDATE ON public.ia_fazenda_config
  FOR EACH ROW EXECUTE FUNCTION public.update_ia_fazenda_config_timestamp();

-- ---------------------------------------------------------------------------
-- 5. RPC para painel de monitoramento: uso da IA por fazenda
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ia_monitoramento()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'fazendas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'fazenda_id', f.id,
        'fazenda_nome', f.nome,
        'ia_ativo', COALESCE(ic.ia_ativo, false),
        'limite_diario', COALESCE(ic.limite_diario, 0),
        'custo_input_por_mil', COALESCE(ic.custo_input_por_mil, 0.075),
        'custo_output_por_mil', COALESCE(ic.custo_output_por_mil, 0.30),
        'custo_cached_por_mil', COALESCE(ic.custo_cached_por_mil, 0.01875),
        'total_perguntas', COALESCE(stats.total_perguntas, 0),
        'perguntas_hoje', COALESCE(stats.perguntas_hoje, 0),
        'perguntas_30d', COALESCE(stats.perguntas_30d, 0),
        'total_tokens_input', COALESCE(stats.total_tokens_input, 0),
        'total_tokens_output', COALESCE(stats.total_tokens_output, 0),
        'total_tokens_cached', COALESCE(stats.total_tokens_cached, 0),
        'custo_total_usd', COALESCE(stats.custo_total_usd, 0),
        'custo_30d_usd', COALESCE(stats.custo_30d_usd, 0),
        'custo_hoje_usd', COALESCE(stats.custo_hoje_usd, 0),
        'ultima_pergunta', stats.ultima_pergunta,
        'media_tokens_input', COALESCE(stats.media_tokens_input, 0),
        'media_tokens_output', COALESCE(stats.media_tokens_output, 0)
      ) ORDER BY f.nome)
      FROM public.fazendas f
      LEFT JOIN public.ia_fazenda_config ic ON ic.fazenda_id = f.id
      LEFT JOIN LATERAL (
        SELECT
          count(*) AS total_perguntas,
          count(*) FILTER (WHERE l.created_at >= CURRENT_DATE) AS perguntas_hoje,
          count(*) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '30 days') AS perguntas_30d,
          COALESCE(sum(l.tokens_input), 0) AS total_tokens_input,
          COALESCE(sum(l.tokens_output), 0) AS total_tokens_output,
          COALESCE(sum(l.tokens_cached), 0) AS total_tokens_cached,
          COALESCE(sum(l.custo_estimado_usd), 0) AS custo_total_usd,
          COALESCE(sum(l.custo_estimado_usd) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) AS custo_30d_usd,
          COALESCE(sum(l.custo_estimado_usd) FILTER (WHERE l.created_at >= CURRENT_DATE), 0) AS custo_hoje_usd,
          max(l.created_at) AS ultima_pergunta,
          COALESCE(avg(l.tokens_input), 0) AS media_tokens_input,
          COALESCE(avg(l.tokens_output), 0) AS media_tokens_output
        FROM public.chat_ia_logs l
        WHERE l.fazenda_id = f.id
      ) stats ON true
      WHERE f.ativo = true
    ), '[]'::jsonb),
    'resumo_global', jsonb_build_object(
      'total_fazendas_ativas', (SELECT count(*) FROM public.fazendas WHERE ativo = true),
      'total_fazendas_com_ia', (SELECT count(*) FROM public.ia_fazenda_config WHERE ia_ativo = true),
      'total_perguntas', (SELECT count(*) FROM public.chat_ia_logs),
      'perguntas_hoje', (SELECT count(*) FROM public.chat_ia_logs WHERE created_at >= CURRENT_DATE),
      'perguntas_30d', (SELECT count(*) FROM public.chat_ia_logs WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
      'custo_total_usd', (SELECT COALESCE(sum(custo_estimado_usd), 0) FROM public.chat_ia_logs),
      'custo_hoje_usd', (SELECT COALESCE(sum(custo_estimado_usd), 0) FROM public.chat_ia_logs WHERE created_at >= CURRENT_DATE),
      'custo_30d_usd', (SELECT COALESCE(sum(custo_estimado_usd), 0) FROM public.chat_ia_logs WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
      'total_tokens_input', (SELECT COALESCE(sum(tokens_input), 0) FROM public.chat_ia_logs),
      'total_tokens_output', (SELECT COALESCE(sum(tokens_output), 0) FROM public.chat_ia_logs),
      'total_tokens_cached', (SELECT COALESCE(sum(tokens_cached), 0) FROM public.chat_ia_logs)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Revogar execute público e garantir que só super_admin e admin podem chamar
REVOKE EXECUTE ON FUNCTION public.get_ia_monitoramento() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ia_monitoramento() TO authenticated;
