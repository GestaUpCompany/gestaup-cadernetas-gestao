DROP FUNCTION IF EXISTS public.resumo_execucoes_rotina(UUID, DATE, DATE, UUID, TEXT);
DROP FUNCTION IF EXISTS public.obter_execucoes_rotina(UUID, DATE, DATE, UUID, TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.obter_execucoes_rotina(
  p_fazenda_id UUID,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_funcionario_id UUID DEFAULT NULL,
  p_caderneta_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  fazenda_id UUID,
  funcionario_id UUID,
  funcionario_nome TEXT,
  rotina_id UUID,
  caderneta_id TEXT,
  data DATE,
  horario_programado TIME,
  primeiro_acesso TIMESTAMPTZ,
  primeiro_registro TIMESTAMPTZ,
  primeiro_acesso_local TEXT,
  primeiro_registro_local TEXT,
  status TEXT,
  observacao TEXT,
  concluido BOOLEAN,
  total INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tol INTEGER;
  v_tz TEXT;
BEGIN
  SELECT COALESCE(faz.tolerancia_rotina_minutos, 30), COALESCE(faz.timezone, 'UTC')
  INTO v_tol, v_tz
  FROM public.fazendas AS faz
  WHERE faz.id = p_fazenda_id;

  RETURN QUERY
  WITH base AS (
    SELECT
      er.id AS exec_id,
      er.fazenda_id AS exec_fazenda_id,
      er.funcionario_id AS exec_funcionario_id,
      f.nome AS exec_funcionario_nome,
      er.rotina_id AS exec_rotina_id,
      er.caderneta_id AS exec_caderneta_id,
      er.data AS exec_data,
      er.horario_programado AS exec_horario_programado,
      er.primeiro_acesso AS exec_primeiro_acesso,
      er.primeiro_registro AS exec_primeiro_registro,
      er.primeiro_acesso_local AS exec_primeiro_acesso_local,
      er.primeiro_registro_local AS exec_primeiro_registro_local,
      er.status AS exec_status,
      er.observacao AS exec_observacao,
      er.concluido AS exec_concluido,
      CASE
        WHEN er.status = 'dispensado' THEN 'dispensado'
        WHEN er.primeiro_registro IS NULL THEN 'nao_executado'
        WHEN er.horario_programado IS NULL THEN 'no_horario'
        ELSE 'calcular'
      END AS status_pre,
      COALESCE(
        er.primeiro_registro_local::TIME,
        (er.primeiro_registro AT TIME ZONE v_tz)::TIME
      ) AS registro_time_local
    FROM public.execucoes_rotina er
    JOIN public.funcionarios f ON f.id = er.funcionario_id
    WHERE er.fazenda_id = p_fazenda_id
      AND (p_data_inicio IS NULL OR er.data >= p_data_inicio)
      AND (p_data_fim IS NULL OR er.data <= p_data_fim)
      AND (p_funcionario_id IS NULL OR er.funcionario_id = p_funcionario_id)
      AND (p_caderneta_id IS NULL OR er.caderneta_id = p_caderneta_id)
  ),
  base_status AS (
    SELECT
      b.*,
      CASE
        WHEN b.status_pre = 'dispensado' THEN 'dispensado'
        WHEN b.status_pre = 'nao_executado' THEN 'nao_executado'
        WHEN b.status_pre = 'no_horario' THEN 'no_horario'
        WHEN b.registro_time_local IS NULL THEN 'nao_executado'
        WHEN ABS(EXTRACT(EPOCH FROM (b.registro_time_local - b.exec_horario_programado)) / 60) <= v_tol THEN 'no_horario'
        WHEN b.registro_time_local > b.exec_horario_programado THEN 'atrasado'
        ELSE 'antecipado'
      END AS status_calculado
    FROM base b
  ),
  filtrada AS (
    SELECT * FROM base_status
    WHERE (p_status IS NULL OR status_calculado = p_status)
  ),
  contagem AS (
    SELECT COUNT(*)::INTEGER AS total FROM filtrada
  )
  SELECT
    filtrada.exec_id,
    filtrada.exec_fazenda_id,
    filtrada.exec_funcionario_id,
    filtrada.exec_funcionario_nome,
    filtrada.exec_rotina_id,
    filtrada.exec_caderneta_id,
    filtrada.exec_data,
    filtrada.exec_horario_programado,
    filtrada.exec_primeiro_acesso,
    filtrada.exec_primeiro_registro,
    filtrada.exec_primeiro_acesso_local,
    filtrada.exec_primeiro_registro_local,
    filtrada.status_calculado,
    filtrada.exec_observacao,
    filtrada.exec_concluido,
    contagem.total
  FROM filtrada, contagem
  ORDER BY filtrada.exec_data DESC, filtrada.exec_funcionario_nome ASC, filtrada.exec_caderneta_id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.resumo_execucoes_rotina(
  p_fazenda_id UUID,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_funcionario_id UUID DEFAULT NULL,
  p_caderneta_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  data DATE,
  programadas BIGINT,
  no_horario BIGINT,
  atrasadas BIGINT,
  antecipadas BIGINT,
  nao_executadas BIGINT,
  dispensadas BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH exec AS (
    SELECT * FROM public.obter_execucoes_rotina(
      p_fazenda_id,
      p_data_inicio,
      p_data_fim,
      p_funcionario_id,
      p_caderneta_id,
      NULL,
      100000,
      0
    )
  )
  SELECT
    e.data,
    COUNT(*) AS programadas,
    COUNT(*) FILTER (WHERE e.status = 'no_horario') AS no_horario,
    COUNT(*) FILTER (WHERE e.status = 'atrasado') AS atrasadas,
    COUNT(*) FILTER (WHERE e.status = 'antecipado') AS antecipadas,
    COUNT(*) FILTER (WHERE e.status = 'nao_executado') AS nao_executadas,
    COUNT(*) FILTER (WHERE e.status = 'dispensado') AS dispensadas
  FROM exec e
  GROUP BY e.data
  ORDER BY e.data DESC;
END;
$$;;
