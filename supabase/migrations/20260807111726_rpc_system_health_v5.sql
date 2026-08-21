CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_result jsonb;
  v_db_stats record;
  v_start_time timestamptz;
BEGIN
  -- Capturar stats do banco em uma única leitura
  SELECT * INTO v_db_stats FROM pg_stat_database WHERE datname = 'postgres';
  v_start_time := pg_postmaster_start_time();

  SELECT jsonb_build_object(
    'postgres', jsonb_build_object(
      'version', split_part(current_setting('server_version'), ' ', 1),
      'timezone', current_setting('TimeZone'),
      'maxConnections', current_setting('max_connections')::int,
      'sharedBuffers', current_setting('shared_buffers'),
      'effectiveCacheSize', current_setting('effective_cache_size'),
      'workMem', current_setting('work_mem'),
      'startTime', v_start_time,
      'uptimeSeconds', EXTRACT(EPOCH FROM (now() - v_start_time))
    ),
    'database', jsonb_build_object(
      'sizeBytes', pg_database_size('postgres'),
      'sizePretty', pg_size_pretty(pg_database_size('postgres')),
      'totalTables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
      'totalIndexes', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'),
      'totalFunctions', (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public'),
      'securityDefinerFunctions', (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prosecdef = true),
      'rlsTables', (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public'),
      'rlsPolicies', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public')
    ),
    'connections', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'postgres'),
      'active', (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'postgres' AND state = 'active'),
      'idle', (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'postgres' AND state = 'idle'),
      'idleInTransaction', (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'postgres' AND state = 'idle in transaction'),
      'maxDirect', current_setting('max_connections')::int
    ),
    'users', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM auth.users),
      'active24h', (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > now() - interval '24 hours'),
      'active1h', (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > now() - interval '1 hour'),
      'activeSessions1h', (SELECT COUNT(*) FROM auth.sessions WHERE created_at > now() - interval '1 hour'),
      'signupsToday', (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE),
      'signups7d', (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
      'byRole', COALESCE((SELECT jsonb_agg(jsonb_build_object('role', role, 'count', cnt))
        FROM (
          SELECT COALESCE(raw_user_meta_data->>'papel', 'sem_papel') AS role, COUNT(*) AS cnt
          FROM auth.users
          GROUP BY raw_user_meta_data->>'papel'
          ORDER BY COUNT(*) DESC
        ) t), '[]'::jsonb)
    ),
    'fazendas', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM public.fazendas),
      'ativas', (SELECT COUNT(*) FROM public.fazendas WHERE ativo = true),
      'withUsers24h', (SELECT COUNT(DISTINCT f.id)
        FROM public.fazendas f
        JOIN public.usuario_fazenda uf ON uf.fazenda_id = f.id
        JOIN auth.users u ON u.id = uf.usuario_id
        WHERE u.last_sign_in_at > now() - interval '24 hours')
    ),
    'dataVolume', jsonb_build_object(
      'lotes', (SELECT COUNT(*) FROM public.lotes WHERE deleted_at IS NULL),
      'individuos', (SELECT COUNT(*) FROM public.individuos WHERE deleted_at IS NULL),
      'registrosSuplementacao', (SELECT COUNT(*) FROM public.registros_suplementacao WHERE deleted_at IS NULL),
      'registrosMaternidade', (SELECT COUNT(*) FROM public.registros_maternidade WHERE deleted_at IS NULL),
      'registrosEnfermaria', (SELECT COUNT(*) FROM public.registros_enfermaria WHERE deleted_at IS NULL),
      'planosNutricionais', (SELECT COUNT(*) FROM public.planos_nutricionais)
    ),
    'throughput', jsonb_build_object(
      'xactCommit', v_db_stats.xact_commit,
      'xactRollback', v_db_stats.xact_rollback,
      'xactTotal', v_db_stats.xact_commit + v_db_stats.xact_rollback,
      'rollbackRate', CASE
        WHEN (v_db_stats.xact_commit + v_db_stats.xact_rollback) > 0
        THEN round((v_db_stats.xact_rollback::float / (v_db_stats.xact_commit + v_db_stats.xact_rollback) * 100)::numeric, 2)
        ELSE 0
      END,
      'tupInserted', v_db_stats.tup_inserted,
      'tupUpdated', v_db_stats.tup_updated,
      'tupDeleted', v_db_stats.tup_deleted,
      'tupReturned', v_db_stats.tup_returned,
      'tupFetched', v_db_stats.tup_fetched
    ),
    'cache', jsonb_build_object(
      'hitRatio', COALESCE(round((v_db_stats.blks_hit::float / NULLIF(v_db_stats.blks_hit + v_db_stats.blks_read, 0) * 100)::numeric, 2), 0),
      'blksHit', v_db_stats.blks_hit,
      'blksRead', v_db_stats.blks_read,
      'deadlocks', v_db_stats.deadlocks,
      'conflicts', v_db_stats.conflicts,
      'tempBytes', v_db_stats.temp_bytes,
      'tempFiles', v_db_stats.temp_files
    ),
    'indexUsage', jsonb_build_object(
      'seqScans', COALESCE((SELECT SUM(seq_scan) FROM pg_stat_user_tables WHERE schemaname = 'public'), 0),
      'idxScans', COALESCE((SELECT SUM(idx_scan) FROM pg_stat_user_tables WHERE schemaname = 'public'), 0),
      'indexHitRatio', COALESCE((
        SELECT round((idx_blks_hit::float / NULLIF(idx_blks_hit + idx_blks_read, 0) * 100)::numeric, 2)
        FROM pg_statio_user_tables WHERE schemaname = 'public'
        HAVING idx_blks_hit + idx_blks_read > 0
        LIMIT 1
      ), 0),
      'deadTuples', COALESCE((SELECT SUM(n_dead_tup) FROM pg_stat_user_tables WHERE schemaname = 'public'), 0),
      'liveTuples', COALESCE((SELECT SUM(n_live_tup) FROM pg_stat_user_tables WHERE schemaname = 'public'), 0)
    ),
    'topTables', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', relname,
        'sizePretty', pg_size_pretty(pg_total_relation_size(relid)),
        'sizeBytes', pg_total_relation_size(relid)
      ))
      FROM (
        SELECT relname, relid
        FROM pg_catalog.pg_statio_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 10
      ) top10
    ), '[]'::jsonb),
    'slowQueries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'pid', pid,
        'state', state,
        'query', left(query, 200),
        'durationMs', EXTRACT(EPOCH FROM (now() - query_start)) * 1000,
        'applicationName', application_name,
        'userName', usename
      ) ORDER BY query_start)
      FROM pg_stat_activity
      WHERE datname = 'postgres'
        AND state = 'active'
        AND query NOT ILIKE '%pg_stat_activity%'
        AND query_start IS NOT NULL
    ), '[]'::jsonb),
    'cronJobs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'jobid', jobid,
        'jobname', jobname,
        'schedule', schedule,
        'active', active,
        'command', left(command, 150)
      ) ORDER BY jobid)
      FROM cron.job
    ), '[]'::jsonb),
    'timestamp', now()
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_system_health() FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_system_health() TO authenticated;;
