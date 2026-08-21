-- Tabela de amostras históricas para gráficos de tendência
CREATE TABLE IF NOT EXISTS public.system_health_samples (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sampled_at timestamptz NOT NULL DEFAULT now(),
  db_size_bytes bigint NOT NULL,
  active_connections int NOT NULL,
  total_connections int NOT NULL,
  active_users_1h int NOT NULL,
  active_sessions_1h int NOT NULL,
  cache_hit_ratio numeric(6,2) NOT NULL,
  xact_total bigint NOT NULL,
  xact_commit bigint NOT NULL,
  xact_rollback bigint NOT NULL,
  avg_active_query_ms numeric(10,2) NOT NULL DEFAULT 0,
  max_active_query_ms numeric(10,2) NOT NULL DEFAULT 0,
  active_queries_count int NOT NULL DEFAULT 0,
  per_fazenda jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- RLS: apenas super_admin pode ler (authenticated com papel super_admin)
ALTER TABLE public.system_health_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_system_health_samples_select ON public.system_health_samples
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rls_system_health_samples_insert ON public.system_health_samples
  FOR INSERT TO authenticated WITH CHECK (true);

-- Índice para consultas por período
CREATE INDEX idx_system_health_samples_sampled_at ON public.system_health_samples (sampled_at DESC);

-- Retenção automática: manter apenas últimos 30 dias
-- (executado pelo cron de amostragem)

-- Função de amostragem executada a cada 5 minutos pelo pg_cron
CREATE OR REPLACE FUNCTION public.sample_system_health()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_db_stats record;
  v_db_size bigint;
  v_active_conns int;
  v_total_conns int;
  v_active_users_1h int;
  v_active_sessions_1h int;
  v_cache_ratio numeric(6,2);
  v_avg_query_ms numeric(10,2) := 0;
  v_max_query_ms numeric(10,2) := 0;
  v_active_queries int := 0;
  v_per_fazenda jsonb;
BEGIN
  -- Stats do banco
  SELECT * INTO v_db_stats FROM pg_stat_database WHERE datname = 'postgres';
  v_db_size := pg_database_size('postgres');
  v_cache_ratio := COALESCE(round((v_db_stats.blks_hit::float / NULLIF(v_db_stats.blks_hit + v_db_stats.blks_read, 0) * 100)::numeric, 2), 0);

  -- Conexões
  SELECT 
    COUNT(*) FILTER (WHERE state = 'active'),
    COUNT(*)
  INTO v_active_conns, v_total_conns
  FROM pg_stat_activity WHERE datname = 'postgres';

  -- Usuários e sessões
  SELECT 
    COUNT(*) FILTER (WHERE last_sign_in_at > now() - interval '1 hour'),
    (SELECT COUNT(*) FROM auth.sessions WHERE created_at > now() - interval '1 hour')
  INTO v_active_users_1h, v_active_sessions_1h
  FROM auth.users;

  -- Latência das queries ativas (não-sistema)
  SELECT 
    COALESCE(round(avg(EXTRACT(EPOCH FROM (now() - query_start)) * 1000)::numeric, 2), 0),
    COALESCE(round(max(EXTRACT(EPOCH FROM (now() - query_start)) * 1000)::numeric, 2), 0),
    COUNT(*)
  INTO v_avg_query_ms, v_max_query_ms, v_active_queries
  FROM pg_stat_activity
  WHERE datname = 'postgres'
    AND state = 'active'
    AND query NOT ILIKE '%pg_stat_activity%'
    AND query NOT ILIKE '%sample_system_health%'
    AND query_start IS NOT NULL;

  -- Sessões ativas por fazenda (última 1h)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fazenda_id', f.id,
    'fazenda_nome', f.nome,
    'active_users', cnt
  ) ORDER BY cnt DESC), '[]'::jsonb) INTO v_per_fazenda
  FROM (
    SELECT f.id, f.nome, COUNT(DISTINCT u.id) AS cnt
    FROM public.fazendas f
    JOIN public.usuario_fazenda uf ON uf.fazenda_id = f.id
    JOIN auth.users u ON u.id = uf.usuario_id
    WHERE u.last_sign_in_at > now() - interval '1 hour'
      AND f.ativo = true
    GROUP BY f.id, f.nome
  ) f;

  -- Inserir amostra
  INSERT INTO public.system_health_samples (
    db_size_bytes, active_connections, total_connections,
    active_users_1h, active_sessions_1h, cache_hit_ratio,
    xact_total, xact_commit, xact_rollback,
    avg_active_query_ms, max_active_query_ms, active_queries_count,
    per_fazenda
  ) VALUES (
    v_db_size, v_active_conns, v_total_conns,
    v_active_users_1h, v_active_sessions_1h, v_cache_ratio,
    v_db_stats.xact_commit + v_db_stats.xact_rollback,
    v_db_stats.xact_commit, v_db_stats.xact_rollback,
    v_avg_query_ms, v_max_query_ms, v_active_queries,
    v_per_fazenda
  );

  -- Limpeza: remover amostras com mais de 30 dias
  DELETE FROM public.system_health_samples WHERE sampled_at < now() - interval '30 days';
END;
$function$;

-- Agendar cron a cada 5 minutos
SELECT cron.schedule(
  'system-health-sampling',
  '*/5 * * * *',
  'SELECT public.sample_system_health();'
);

-- Inserir uma amostra inicial para não esperar 5 min
SELECT public.sample_system_health();;
