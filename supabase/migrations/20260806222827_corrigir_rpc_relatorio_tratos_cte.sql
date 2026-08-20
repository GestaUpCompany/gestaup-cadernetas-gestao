CREATE OR REPLACE FUNCTION public.get_dados_relatorio_tratos(
  p_token uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fazenda_id uuid;
  v_ativo boolean;
  v_expira timestamptz;
  v_fazenda_nome text;
  v_fazenda_logo_url text;
  v_timezone text;
  v_linhas jsonb;
  v_lotes_disponiveis jsonb;
  v_resumo jsonb;
BEGIN
  SELECT fazenda_id, ativo, expira_em INTO v_fazenda_id, v_ativo, v_expira
  FROM relatorios_publicos
  WHERE id = p_token AND tipo = 'tratos';

  IF NOT FOUND OR v_ativo = false OR (v_expira IS NOT NULL AND v_expira < now()) THEN
    RAISE EXCEPTION 'Token invalido ou expirado';
  END IF;

  SELECT nome, logo_url, COALESCE(timezone, 'America/Cuiaba') INTO v_fazenda_nome, v_fazenda_logo_url, v_timezone
  FROM fazendas
  WHERE id = v_fazenda_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('lote_id', l.id, 'lote_nome', l.nome) ORDER BY l.nome), '[]'::jsonb)
  INTO v_lotes_disponiveis
  FROM (
    SELECT DISTINCT r.lote_id
    FROM registros_oferta_trato r
    WHERE r.fazenda_id = v_fazenda_id
      AND r.deleted_at IS NULL
      AND r.lote_id IS NOT NULL
  ) regs
  JOIN lotes l ON l.id = regs.lote_id;

  -- Linhas detalhadas e resumo em um único WITH
  WITH regs AS (
    SELECT
      r.id, r.lote_id, l.nome AS lote_nome, r.curral_id, c.nome AS curral_nome,
      r.ordem_trato, r.kg_planejado, r.kg_ofertado_real, r.leitura_cocho_nota,
      r.programacao_id, r.nome_usuario, r.data,
      to_char(r.data AT TIME ZONE v_timezone, 'HH24:MI') AS horario_real,
      to_char(r.data AT TIME ZONE v_timezone, 'YYYY-MM-DD') AS data_dia
    FROM registros_oferta_trato r
    JOIN lotes l ON l.id = r.lote_id
    LEFT JOIN currais c ON c.id = r.curral_id
    WHERE r.fazenda_id = v_fazenda_id
      AND r.deleted_at IS NULL
      AND r.lote_id IS NOT NULL
      AND (p_data_inicio IS NULL OR (r.data AT TIME ZONE v_timezone)::date >= p_data_inicio)
      AND (p_data_fim IS NULL OR (r.data AT TIME ZONE v_timezone)::date <= p_data_fim)
  ),
  regs_com_sugerido AS (
    SELECT r.*, ptp.horario_sugerido, to_char(ptp.horario_sugerido, 'HH24:MI') AS horario_sugerido_str
    FROM regs r
    LEFT JOIN programacao_tratos_percentuais ptp
      ON ptp.programacao_id = r.programacao_id AND ptp.ordem_trato = r.ordem_trato
  ),
  linhas_calc AS (
    SELECT
      r.data_dia AS data, r.lote_id, r.lote_nome, r.curral_nome, r.ordem_trato,
      r.kg_planejado, r.kg_ofertado_real,
      CASE WHEN r.kg_ofertado_real IS NULL OR r.kg_ofertado_real = 0 THEN NULL ELSE r.kg_ofertado_real - r.kg_planejado END AS desvio_kg,
      CASE WHEN r.kg_ofertado_real IS NULL OR r.kg_ofertado_real = 0 THEN NULL WHEN r.kg_planejado > 0 THEN round(((r.kg_ofertado_real - r.kg_planejado) / r.kg_planejado * 100)::numeric, 2) ELSE NULL END AS desvio_pct,
      r.leitura_cocho_nota, r.horario_sugerido_str AS horario_sugerido, r.horario_real,
      CASE WHEN r.horario_sugerido_str IS NULL OR r.horario_real IS NULL THEN NULL ELSE (EXTRACT(HOUR FROM r.horario_real::time) * 60 + EXTRACT(MINUTE FROM r.horario_real::time) - EXTRACT(HOUR FROM r.horario_sugerido) * 60 - EXTRACT(MINUTE FROM r.horario_sugerido)) END AS desvio_min,
      r.nome_usuario AS tratador,
      CASE WHEN r.kg_ofertado_real IS NULL OR r.kg_ofertado_real = 0 THEN 'sem_execucao' WHEN r.kg_planejado > 0 AND abs((r.kg_ofertado_real - r.kg_planejado) / r.kg_planejado * 100) <= 5 THEN 'ok' WHEN r.kg_planejado > 0 AND abs((r.kg_ofertado_real - r.kg_planejado) / r.kg_planejado * 100) <= 15 THEN 'alerta' ELSE 'critico' END AS status_kg,
      CASE WHEN r.horario_sugerido_str IS NULL THEN 'sem_horario' WHEN abs(EXTRACT(HOUR FROM r.horario_real::time) * 60 + EXTRACT(MINUTE FROM r.horario_real::time) - EXTRACT(HOUR FROM r.horario_sugerido) * 60 - EXTRACT(MINUTE FROM r.horario_sugerido)) <= 15 THEN 'ok' WHEN abs(EXTRACT(HOUR FROM r.horario_real::time) * 60 + EXTRACT(MINUTE FROM r.horario_real::time) - EXTRACT(HOUR FROM r.horario_sugerido) * 60 - EXTRACT(MINUTE FROM r.horario_sugerido)) <= 30 THEN 'alerta' ELSE 'critico' END AS status_horario
    FROM regs_com_sugerido r
  ),
  resumo_calc AS (
    SELECT
      lote_id, lote_nome,
      COALESCE(SUM(kg_planejado), 0) AS planejado_total_kg,
      COALESCE(SUM(kg_ofertado_real), 0) AS real_total_kg,
      COALESCE(SUM(desvio_kg), 0) AS desvio_total_kg,
      CASE WHEN SUM(kg_planejado) > 0 THEN round((SUM(desvio_kg) / SUM(kg_planejado) * 100)::numeric, 2) ELSE NULL END AS desvio_medio_pct,
      COUNT(DISTINCT data) AS dias_com_registro, COUNT(*) AS n_tratos,
      COUNT(*) FILTER (WHERE status_kg = 'ok') AS n_ok,
      COUNT(*) FILTER (WHERE status_kg = 'alerta') AS n_alerta,
      COUNT(*) FILTER (WHERE status_kg = 'critico') AS n_critico,
      COUNT(*) FILTER (WHERE status_kg = 'sem_execucao') AS n_sem_execucao,
      COUNT(*) FILTER (WHERE status_horario = 'ok') AS n_horario_ok,
      COUNT(*) FILTER (WHERE status_horario = 'alerta') AS n_horario_alerta,
      COUNT(*) FILTER (WHERE status_horario = 'critico') AS n_horario_critico,
      CASE WHEN COUNT(*) FILTER (WHERE desvio_min IS NOT NULL) > 0 THEN round(avg(desvio_min) FILTER (WHERE desvio_min IS NOT NULL)::numeric, 1) ELSE NULL END AS desvio_medio_min,
      CASE WHEN SUM(kg_planejado) > 0 THEN CASE WHEN abs(SUM(desvio_kg) / SUM(kg_planejado) * 100) <= 5 THEN 'ok' WHEN abs(SUM(desvio_kg) / SUM(kg_planejado) * 100) <= 15 THEN 'alerta' ELSE 'critico' END WHEN COALESCE(SUM(kg_ofertado_real), 0) = 0 THEN 'sem_execucao' ELSE 'ok' END AS status
    FROM linhas_calc
    GROUP BY lote_id, lote_nome
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'data', data, 'lote_id', lote_id, 'lote_nome', lote_nome, 'curral_nome', curral_nome,
    'ordem_trato', ordem_trato, 'kg_planejado', kg_planejado, 'kg_ofertado_real', kg_ofertado_real,
    'desvio_kg', desvio_kg, 'desvio_pct', desvio_pct, 'leitura_cocho_nota', leitura_cocho_nota,
    'horario_sugerido', horario_sugerido, 'horario_real', horario_real, 'desvio_min', desvio_min,
    'tratador', tratador, 'status_kg', status_kg, 'status_horario', status_horario
  ) ORDER BY data DESC, lote_nome, ordem_trato), '[]'::jsonb)
  INTO v_linhas
  FROM linhas_calc;

  WITH resumo_calc AS (
    SELECT
      lote_id, lote_nome,
      COALESCE(SUM(kg_planejado), 0) AS planejado_total_kg,
      COALESCE(SUM(kg_ofertado_real), 0) AS real_total_kg,
      COALESCE(SUM(desvio_kg), 0) AS desvio_total_kg,
      CASE WHEN SUM(kg_planejado) > 0 THEN round((SUM(desvio_kg) / SUM(kg_planejado) * 100)::numeric, 2) ELSE NULL END AS desvio_medio_pct,
      COUNT(DISTINCT data) AS dias_com_registro, COUNT(*) AS n_tratos,
      COUNT(*) FILTER (WHERE status_kg = 'ok') AS n_ok,
      COUNT(*) FILTER (WHERE status_kg = 'alerta') AS n_alerta,
      COUNT(*) FILTER (WHERE status_kg = 'critico') AS n_critico,
      COUNT(*) FILTER (WHERE status_kg = 'sem_execucao') AS n_sem_execucao,
      COUNT(*) FILTER (WHERE status_horario = 'ok') AS n_horario_ok,
      COUNT(*) FILTER (WHERE status_horario = 'alerta') AS n_horario_alerta,
      COUNT(*) FILTER (WHERE status_horario = 'critico') AS n_horario_critico,
      CASE WHEN COUNT(*) FILTER (WHERE desvio_min IS NOT NULL) > 0 THEN round(avg(desvio_min) FILTER (WHERE desvio_min IS NOT NULL)::numeric, 1) ELSE NULL END AS desvio_medio_min,
      CASE WHEN SUM(kg_planejado) > 0 THEN CASE WHEN abs(SUM(desvio_kg) / SUM(kg_planejado) * 100) <= 5 THEN 'ok' WHEN abs(SUM(desvio_kg) / SUM(kg_planejado) * 100) <= 15 THEN 'alerta' ELSE 'critico' END WHEN COALESCE(SUM(kg_ofertado_real), 0) = 0 THEN 'sem_execucao' ELSE 'ok' END AS status
    FROM (
      SELECT
        to_char(r.data AT TIME ZONE v_timezone, 'YYYY-MM-DD') AS data, r.lote_id, l.nome AS lote_nome, r.ordem_trato,
        r.kg_planejado, r.kg_ofertado_real,
        CASE WHEN r.kg_ofertado_real IS NULL OR r.kg_ofertado_real = 0 THEN NULL ELSE r.kg_ofertado_real - r.kg_planejado END AS desvio_kg,
        to_char(r.data AT TIME ZONE v_timezone, 'HH24:MI') AS horario_real,
        to_char(ptp.horario_sugerido, 'HH24:MI') AS horario_sugerido_str,
        CASE WHEN r.kg_ofertado_real IS NULL OR r.kg_ofertado_real = 0 THEN 'sem_execucao' WHEN r.kg_planejado > 0 AND abs((r.kg_ofertado_real - r.kg_planejado) / r.kg_planejado * 100) <= 5 THEN 'ok' WHEN r.kg_planejado > 0 AND abs((r.kg_ofertado_real - r.kg_planejado) / r.kg_planejado * 100) <= 15 THEN 'alerta' ELSE 'critico' END AS status_kg,
        CASE WHEN ptp.horario_sugerido IS NULL THEN 'sem_horario' WHEN abs(EXTRACT(HOUR FROM (r.data AT TIME ZONE v_timezone)::time) * 60 + EXTRACT(MINUTE FROM (r.data AT TIME ZONE v_timezone)::time) - EXTRACT(HOUR FROM ptp.horario_sugerido) * 60 - EXTRACT(MINUTE FROM ptp.horario_sugerido)) <= 15 THEN 'ok' WHEN abs(EXTRACT(HOUR FROM (r.data AT TIME ZONE v_timezone)::time) * 60 + EXTRACT(MINUTE FROM (r.data AT TIME ZONE v_timezone)::time) - EXTRACT(HOUR FROM ptp.horario_sugerido) * 60 - EXTRACT(MINUTE FROM ptp.horario_sugerido)) <= 30 THEN 'alerta' ELSE 'critico' END AS status_horario,
        CASE WHEN ptp.horario_sugerido IS NULL THEN NULL ELSE (EXTRACT(HOUR FROM (r.data AT TIME ZONE v_timezone)::time) * 60 + EXTRACT(MINUTE FROM (r.data AT TIME ZONE v_timezone)::time) - EXTRACT(HOUR FROM ptp.horario_sugerido) * 60 - EXTRACT(MINUTE FROM ptp.horario_sugerido)) END AS desvio_min
      FROM registros_oferta_trato r
      JOIN lotes l ON l.id = r.lote_id
      LEFT JOIN programacao_tratos_percentuais ptp ON ptp.programacao_id = r.programacao_id AND ptp.ordem_trato = r.ordem_trato
      WHERE r.fazenda_id = v_fazenda_id AND r.deleted_at IS NULL AND r.lote_id IS NOT NULL
        AND (p_data_inicio IS NULL OR (r.data AT TIME ZONE v_timezone)::date >= p_data_inicio)
        AND (p_data_fim IS NULL OR (r.data AT TIME ZONE v_timezone)::date <= p_data_fim)
    ) lc
    GROUP BY lote_id, lote_nome
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'lote_id', lote_id, 'lote_nome', lote_nome, 'planejado_total_kg', planejado_total_kg,
    'real_total_kg', real_total_kg, 'desvio_total_kg', desvio_total_kg, 'desvio_medio_pct', desvio_medio_pct,
    'dias_com_registro', dias_com_registro, 'n_tratos', n_tratos,
    'n_ok', n_ok, 'n_alerta', n_alerta, 'n_critico', n_critico, 'n_sem_execucao', n_sem_execucao,
    'n_horario_ok', n_horario_ok, 'n_horario_alerta', n_horario_alerta, 'n_horario_critico', n_horario_critico,
    'desvio_medio_min', desvio_medio_min, 'status', status
  ) ORDER BY lote_nome), '[]'::jsonb)
  INTO v_resumo
  FROM resumo_calc;

  RETURN jsonb_build_object(
    'fazenda_id', v_fazenda_id,
    'dados', jsonb_build_object(
      'fazenda_nome', v_fazenda_nome,
      'fazenda_logo_url', v_fazenda_logo_url,
      'timezone', v_timezone,
      'lotes_disponiveis', v_lotes_disponiveis,
      'linhas', v_linhas,
      'resumo_por_lote', v_resumo
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dados_relatorio_tratos(uuid, date, date) TO anon, authenticated;;
