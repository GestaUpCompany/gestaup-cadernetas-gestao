-- RPC para ranking de uso por fazenda
-- Retorna métricas de volume, atividade e crescimento por fazenda
CREATE OR REPLACE FUNCTION public.get_farm_usage_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'farms', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', f.id,
        'nome', f.nome,
        'ativo', f.ativo,
        'createdAt', f.created_at,
        'usuarios', COALESCE(uf.usuario_count, 0),
        'usuariosAtivos24h', COALESCE(uf.ativos_24h, 0),
        'usuariosAtivos7d', COALESCE(uf.ativos_7d, 0),
        'lotes', COALESCE(d.lotes, 0),
        'lotesAtivos', COALESCE(d.lotes_ativos, 0),
        'individuos', COALESCE(d.individuos, 0),
        'pastos', COALESCE(d.pastos, 0),
        'currais', COALESCE(d.currais, 0),
        'planosNutricionais', COALESCE(d.planos, 0),
        'planosAtivos', COALESCE(d.planos_ativos, 0),
        'formulacoes', COALESCE(d.formulacoes, 0),
        'registrosSuplementacao', COALESCE(d.reg_suplementacao, 0),
        'registrosSuplementacao30d', COALESCE(d.reg_suplementacao_30d, 0),
        'registrosMaternidade', COALESCE(d.reg_maternidade, 0),
        'registrosEnfermaria', COALESCE(d.reg_enfermaria, 0),
        'registrosMovimentacao', COALESCE(d.reg_movimentacao, 0),
        'registrosLeituraCocho', COALESCE(d.reg_leitura_cocho, 0),
        'registrosAlimentacao', COALESCE(d.reg_alimentacao, 0),
        'notificacoesEnviadas', COALESCE(d.notificacoes, 0),
        'chatIaLogs', COALESCE(d.chat_ia_logs, 0),
        'ultimaAtividade', d.ultima_atividade,
        'tamanhoBytes', COALESCE(d.tamanho_bytes, 0),
        'tamanhoPretty', COALESCE(d.tamanho_pretty, '0 bytes'),
        'crescimento30d', COALESCE(d.reg_30d_total, 0)
      ) ORDER BY d.reg_30d_total DESC NULLS LAST, COALESCE(uf.ativos_24h, 0) DESC)
      FROM public.fazendas f
      LEFT JOIN (
        SELECT
          uf.fazenda_id,
          COUNT(*) as usuario_count,
          COUNT(CASE WHEN u.ultimo_acesso > now() - interval '24 hours' THEN 1 END) as ativos_24h,
          COUNT(CASE WHEN u.ultimo_acesso > now() - interval '7 days' THEN 1 END) as ativos_7d
        FROM public.usuario_fazenda uf
        JOIN public.usuarios u ON u.id = uf.usuario_id
        WHERE uf.ativo = true
        GROUP BY uf.fazenda_id
      ) uf ON uf.fazenda_id = f.id
      LEFT JOIN LATERAL (
        SELECT
          (SELECT COUNT(*) FROM public.lotes WHERE fazenda_id = f.id) as lotes,
          (SELECT COUNT(*) FROM public.lotes WHERE fazenda_id = f.id AND ativo = true) as lotes_ativos,
          (SELECT COUNT(*) FROM public.individuos WHERE fazenda_id = f.id) as individuos,
          (SELECT COUNT(*) FROM public.pastos WHERE fazenda_id = f.id) as pastos,
          (SELECT COUNT(*) FROM public.currais WHERE fazenda_id = f.id) as currais,
          (SELECT COUNT(*) FROM public.planos_nutricionais WHERE fazenda_id = f.id) as planos,
          (SELECT COUNT(*) FROM public.planos_nutricionais WHERE fazenda_id = f.id AND data_fim IS NULL) as planos_ativos,
          (SELECT COUNT(*) FROM public.formulacoes WHERE fazenda_id = f.id AND ativo = true) as formulacoes,
          (SELECT COUNT(*) FROM public.registros_suplementacao WHERE fazenda_id = f.id) as reg_suplementacao,
          (SELECT COUNT(*) FROM public.registros_suplementacao WHERE fazenda_id = f.id AND created_at > now() - interval '30 days') as reg_suplementacao_30d,
          (SELECT COUNT(*) FROM public.registros_maternidade WHERE fazenda_id = f.id) as reg_maternidade,
          (SELECT COUNT(*) FROM public.registros_enfermaria WHERE fazenda_id = f.id) as reg_enfermaria,
          (SELECT COUNT(*) FROM public.registros_movimentacao WHERE fazenda_id = f.id) as reg_movimentacao,
          (SELECT COUNT(*) FROM public.registros_leitura_cocho WHERE fazenda_id = f.id) as reg_leitura_cocho,
          (SELECT COUNT(*) FROM public.registros_alimentacao WHERE fazenda_id = f.id) as reg_alimentacao,
          (SELECT COUNT(*) FROM public.notificacoes WHERE fazenda_id = f.id) as notificacoes,
          (SELECT COUNT(*) FROM public.chat_ia_logs WHERE fazenda_id = f.id) as chat_ia_logs,
          (
            SELECT MAX(dt) FROM (
              SELECT MAX(created_at) as dt FROM public.registros_suplementacao WHERE fazenda_id = f.id
              UNION ALL SELECT MAX(created_at) FROM public.registros_maternidade WHERE fazenda_id = f.id
              UNION ALL SELECT MAX(created_at) FROM public.registros_enfermaria WHERE fazenda_id = f.id
              UNION ALL SELECT MAX(created_at) FROM public.registros_movimentacao WHERE fazenda_id = f.id
              UNION ALL SELECT MAX(created_at) FROM public.registros_leitura_cocho WHERE fazenda_id = f.id
              UNION ALL SELECT MAX(created_at) FROM public.registros_alimentacao WHERE fazenda_id = f.id
              UNION ALL SELECT MAX(updated_at) FROM public.lotes WHERE fazenda_id = f.id
            ) combined
          ) as ultima_atividade,
          (
            (SELECT COUNT(*) FROM public.registros_suplementacao WHERE fazenda_id = f.id AND created_at > now() - interval '30 days') +
            (SELECT COUNT(*) FROM public.registros_maternidade WHERE fazenda_id = f.id AND created_at > now() - interval '30 days') +
            (SELECT COUNT(*) FROM public.registros_enfermaria WHERE fazenda_id = f.id AND created_at > now() - interval '30 days') +
            (SELECT COUNT(*) FROM public.registros_movimentacao WHERE fazenda_id = f.id AND created_at > now() - interval '30 days') +
            (SELECT COUNT(*) FROM public.registros_leitura_cocho WHERE fazenda_id = f.id AND created_at > now() - interval '30 days') +
            (SELECT COUNT(*) FROM public.registros_alimentacao WHERE fazenda_id = f.id AND created_at > now() - interval '30 days')
          ) as reg_30d_total,
          COALESCE(pg_total_relation_size('public.lotes') + pg_total_relation_size('public.individuos') + pg_total_relation_size('public.registros_suplementacao'), 0) as tamanho_bytes,
          'N/A' as tamanho_pretty
      ) d ON true
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'totalFarms', (SELECT COUNT(*) FROM public.fazendas),
      'farmsAtivas', (SELECT COUNT(*) FROM public.fazendas WHERE ativo = true),
      'farmsAtivas24h', (SELECT COUNT(DISTINCT uf.fazenda_id) FROM public.usuario_fazenda uf JOIN public.usuarios u ON u.id = uf.usuario_id WHERE uf.ativo = true AND u.ultimo_acesso > now() - interval '24 hours'),
      'farmsAtivas7d', (SELECT COUNT(DISTINCT uf.fazenda_id) FROM public.usuario_fazenda uf JOIN public.usuarios u ON u.id = uf.usuario_id WHERE uf.ativo = true AND u.ultimo_acesso > now() - interval '7 days'),
      'farmsInativas30d', (SELECT COUNT(*) FROM public.fazendas f WHERE f.ativo = true AND NOT EXISTS (SELECT 1 FROM public.usuario_fazenda uf JOIN public.usuarios u ON u.id = uf.usuario_id WHERE uf.fazenda_id = f.id AND uf.ativo = true AND u.ultimo_acesso > now() - interval '30 days')),
      'totalUsuarios', (SELECT COUNT(*) FROM public.usuarios WHERE ativo = true),
      'totalLotes', (SELECT COUNT(*) FROM public.lotes WHERE ativo = true),
      'totalIndividuos', (SELECT COUNT(*) FROM public.individuos),
      'totalRegistros30d', (
        (SELECT COUNT(*) FROM public.registros_suplementacao WHERE created_at > now() - interval '30 days') +
        (SELECT COUNT(*) FROM public.registros_maternidade WHERE created_at > now() - interval '30 days') +
        (SELECT COUNT(*) FROM public.registros_enfermaria WHERE created_at > now() - interval '30 days') +
        (SELECT COUNT(*) FROM public.registros_movimentacao WHERE created_at > now() - interval '30 days') +
        (SELECT COUNT(*) FROM public.registros_leitura_cocho WHERE created_at > now() - interval '30 days') +
        (SELECT COUNT(*) FROM public.registros_alimentacao WHERE created_at > now() - interval '30 days')
      )
    ),
    'timestamp', now()
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_farm_usage_metrics() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_farm_usage_metrics() TO authenticated;;
