CREATE OR REPLACE FUNCTION public.get_rastreio_cadernetas(
  p_fazenda_id uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE (
  nome_usuario text,
  caderneta text,
  total_registros bigint,
  registros_ativos bigint,
  registros_deletados bigint,
  primeiro_registro timestamptz,
  ultimo_registro timestamptz,
  dias_ativos integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') AS nome_usuario,
    r.caderneta,
    COUNT(*) AS total_registros,
    COUNT(*) FILTER (WHERE r.deleted_at IS NULL) AS registros_ativos,
    COUNT(*) FILTER (WHERE r.deleted_at IS NOT NULL) AS registros_deletados,
    MIN(r.created_at) AS primeiro_registro,
    MAX(r.created_at) AS ultimo_registro,
    COUNT(DISTINCT (r.created_at AT TIME ZONE 'America/Cuiaba')::date)::integer AS dias_ativos
  FROM public.v_registros_unificado r
  WHERE r.fazenda_id = p_fazenda_id
    AND (p_data_inicio IS NULL OR r.created_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR r.created_at < (p_data_fim + interval '1 day'))
  GROUP BY COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)'), r.caderneta
  ORDER BY COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)'), COUNT(*) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_rastreio_cadernetas TO authenticated, anon;;
