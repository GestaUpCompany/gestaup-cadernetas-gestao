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
BEGIN
  SELECT COALESCE(faz.tolerancia_rotina_minutos, 30)
  INTO v_tol
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
      er.status AS exec_status,
      er.observacao AS exec_observacao,
      er.concluido AS exec_concluido,
      CASE
        WHEN er.status = 'dispensado' THEN 'dispensado'
        WHEN er.primeiro_registro IS NULL THEN 'nao_executado'
        WHEN er.horario_programado IS NULL THEN 'no_horario'
        WHEN ABS(EXTRACT(EPOCH FROM (er.primeiro_registro::TIME - er.horario_programado)) / 60) <= v_tol THEN 'no_horario'
        WHEN er.primeiro_registro::TIME > er.horario_programado THEN 'atrasado'
        ELSE 'antecipado'
      END AS status_calculado
    FROM public.execucoes_rotina er
    JOIN public.funcionarios f ON f.id = er.funcionario_id
    WHERE er.fazenda_id = p_fazenda_id
      AND (p_data_inicio IS NULL OR er.data >= p_data_inicio)
      AND (p_data_fim IS NULL OR er.data <= p_data_fim)
      AND (p_funcionario_id IS NULL OR er.funcionario_id = p_funcionario_id)
      AND (p_caderneta_id IS NULL OR er.caderneta_id = p_caderneta_id)
  ),
  filtrada AS (
    SELECT * FROM base
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
    filtrada.status_calculado,
    filtrada.exec_observacao,
    filtrada.exec_concluido,
    contagem.total
  FROM filtrada, contagem
  ORDER BY filtrada.exec_data DESC, filtrada.exec_funcionario_nome ASC, filtrada.exec_caderneta_id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;;
