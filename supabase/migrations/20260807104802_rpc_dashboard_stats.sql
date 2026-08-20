-- RPC consolidada para Dashboard: reduz 30 queries HTTP para 1 chamada RPC

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_fazenda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_result jsonb;
BEGIN
  v_today_start := (CURRENT_DATE::timestamptz AT TIME ZONE 'America/Cuiaba');
  v_today_end := ((CURRENT_DATE + 1)::timestamptz AT TIME ZONE 'America/Cuiaba');

  SELECT jsonb_build_object(
    'cadastroStats', jsonb_build_object(
      'pastos',        (SELECT COUNT(*) FROM pastos WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL),
      'lotes',         (SELECT COUNT(*) FROM lotes WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL),
      'funcionarios',  (SELECT COUNT(*) FROM funcionarios WHERE fazenda_id = p_fazenda_id AND ativo = true),
      'insumos',       (SELECT COUNT(*) FROM insumos WHERE fazenda_id = p_fazenda_id AND ativo = true),
      'pluviometros',  (SELECT COUNT(*) FROM pluviometros WHERE fazenda_id = p_fazenda_id AND ativo = true),
      'medicamentos',  (SELECT COUNT(*) FROM medicamentos WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL)
    ),
    'cadernetaStats', jsonb_build_object(
      'maternidade',         (SELECT COUNT(*) FROM registros_maternidade WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'enfermaria',          (SELECT COUNT(*) FROM registros_enfermaria WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'pastagens',           (SELECT COUNT(*) FROM registros_pastagens WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'rodeio',              (SELECT COUNT(*) FROM registros_rodeio WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'suplementacao',       (SELECT COUNT(*) FROM registros_suplementacao WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'bebedouros',          (SELECT COUNT(*) FROM registros_bebedouros WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'movimentacao',        (SELECT COUNT(*) FROM registros_movimentacao WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'morte',               (SELECT COUNT(*) FROM registros_morte WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'clima',               (SELECT COUNT(*) FROM registros_clima WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'abastecimento',       (SELECT COUNT(*) FROM registros_abastecimento WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'cantina',             (SELECT COUNT(*) FROM registros_alimentacao WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'limpeza',             (SELECT COUNT(*) FROM registros_limpeza WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'operacoes-maquinas',  (SELECT COUNT(*) FROM registros_operacoes_maquinas WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'almoxarifado',        (SELECT COUNT(*) FROM registros_almoxarifado WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'manutencao-maquinas', (SELECT COUNT(*) FROM registros_manutencao_maquinas WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL),
      'problemas',           (SELECT COUNT(*) FROM registros_problemas WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL)
    ),
    'registrosHoje',
      (SELECT COUNT(*) FROM registros_maternidade WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND data >= v_today_start AND data < v_today_end) +
      (SELECT COUNT(*) FROM registros_enfermaria WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND data >= v_today_start AND data < v_today_end) +
      (SELECT COUNT(*) FROM registros_pastagens WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND data >= v_today_start AND data < v_today_end) +
      (SELECT COUNT(*) FROM registros_rodeio WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND data >= v_today_start AND data < v_today_end) +
      (SELECT COUNT(*) FROM registros_suplementacao WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND data >= v_today_start AND data < v_today_end) +
      (SELECT COUNT(*) FROM registros_bebedouros WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND data >= v_today_start AND data < v_today_end) +
      (SELECT COUNT(*) FROM registros_movimentacao WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND data >= v_today_start AND data < v_today_end) +
      (SELECT COUNT(*) FROM registros_morte WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL AND data >= v_today_start AND data < v_today_end)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_gado_stats(p_fazenda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totalAnimais',
      COALESCE((SELECT SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0))
               FROM lote_categorias lc
               JOIN lotes l ON l.id = lc.lote_id
               WHERE l.fazenda_id = p_fazenda_id AND l.ativo = true AND l.deleted_at IS NULL
                 AND lc.ativo = true), 0),
    'animaisPorLote',
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
                 'nome', l.nome,
                 'cabecas', COALESCE(cat_totals.cabecas, 0)
               ))
               FROM lotes l
               LEFT JOIN (
                 SELECT lc.lote_id,
                        SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0)) AS cabecas
                 FROM lote_categorias lc
                 WHERE lc.ativo = true
                 GROUP BY lc.lote_id
               ) cat_totals ON cat_totals.lote_id = l.id
               WHERE l.fazenda_id = p_fazenda_id AND l.ativo = true AND l.deleted_at IS NULL
               ORDER BY l.nome), '[]'::jsonb),
    'pesoMedioLotes',
      COALESCE((SELECT
                 CASE WHEN SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0)) > 0
                   THEN SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0) *
                           COALESCE(lc.peso_vivo_atual_kg_cab, lc.peso_entrada_kg_cab, 0)) /
                        SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0))
                   ELSE 0
                 END
               FROM lote_categorias lc
               JOIN lotes l ON l.id = lc.lote_id
               WHERE l.fazenda_id = p_fazenda_id AND l.ativo = true AND l.deleted_at IS NULL
                 AND lc.ativo = true
                 AND COALESCE(lc.peso_vivo_atual_kg_cab, lc.peso_entrada_kg_cab, 0) > 0), 0),
    'mortesMesAtual',
      COALESCE((SELECT COUNT(*) FROM registros_morte
               WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL), 0),
    'enfermariaMesAtual',
      COALESCE((SELECT COUNT(*) FROM registros_enfermaria
               WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL), 0),
    'causasMorteFrequentes',
      COALESCE((SELECT jsonb_agg(jsonb_build_object('causa', causa_morte, 'total', cnt))
               FROM (
                 SELECT causa_morte, COUNT(*) AS cnt
                 FROM registros_morte
                 WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL
                   AND causa_morte IS NOT NULL
                 GROUP BY causa_morte
                 ORDER BY COUNT(*) DESC
                 LIMIT 5
               ) t), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_recent_activities(p_fazenda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'activities', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'type', tipo,
        'title', titulo,
        'data', data
      ) ORDER BY data DESC)
      FROM (
        SELECT id, 'Maternidade' AS tipo, 'Registro de parto' AS titulo, data
        FROM registros_maternidade
        WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL
          AND (lote_id IS NULL OR lote_id IN (SELECT id FROM lotes WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL))
          AND (pasto_id IS NULL OR pasto_id IN (SELECT id FROM pastos WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL))
        UNION ALL
        SELECT id, 'Enfermaria' AS tipo, 'Registro de tratamento' AS titulo, data
        FROM registros_enfermaria
        WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL
          AND (lote_id IS NULL OR lote_id IN (SELECT id FROM lotes WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL))
          AND (pasto_id IS NULL OR pasto_id IN (SELECT id FROM pastos WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL))
        UNION ALL
        SELECT id, 'Rodeio' AS tipo, 'Registro de rodeio' AS titulo, data
        FROM registros_rodeio
        WHERE fazenda_id = p_fazenda_id AND deleted_at IS NULL
          AND (lote_id IS NULL OR lote_id IN (SELECT id FROM lotes WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL))
          AND (pasto_id IS NULL OR pasto_id IN (SELECT id FROM pastos WHERE fazenda_id = p_fazenda_id AND ativo = true AND deleted_at IS NULL))
      ) recentes
      LIMIT 5
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gado_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_activities(uuid) TO authenticated;;
