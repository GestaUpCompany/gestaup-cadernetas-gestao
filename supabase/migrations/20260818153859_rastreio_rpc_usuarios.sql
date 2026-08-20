CREATE OR REPLACE FUNCTION public.get_rastreio_usuarios(
  p_fazenda_id uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE (
  nome_usuario text,
  total_registros bigint,
  cadernetas_usadas integer,
  primeiro_registro timestamptz,
  ultimo_registro timestamptz,
  dias_ativos integer,
  ultimo_dia_ativo date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    usuario.nome_usuario,
    SUM(usuario.total_por_caderneta)::bigint AS total_registros,
    COUNT(*)::integer AS cadernetas_usadas,
    MIN(usuario.primeiro_registro) AS primeiro_registro,
    MAX(usuario.ultimo_registro) AS ultimo_registro,
    SUM(usuario.dias_por_caderneta)::integer AS dias_ativos,
    MAX(usuario.ultimo_dia) AS ultimo_dia_ativo
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') AS nome_usuario,
      r.caderneta,
      COUNT(*) AS total_por_caderneta,
      MIN(r.created_at) AS primeiro_registro,
      MAX(r.created_at) AS ultimo_registro,
      COUNT(DISTINCT (r.created_at AT TIME ZONE 'America/Cuiaba')::date)::integer AS dias_por_caderneta,
      MAX((r.created_at AT TIME ZONE 'America/Cuiaba')::date) AS ultimo_dia
    FROM public.v_registros_unificado r
    WHERE r.fazenda_id = p_fazenda_id
      AND (p_data_inicio IS NULL OR r.created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR r.created_at < (p_data_fim + interval '1 day'))
    GROUP BY COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)'), r.caderneta
  ) usuario
  GROUP BY usuario.nome_usuario
  ORDER BY total_registros DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_rastreio_usuarios TO authenticated, anon;;
