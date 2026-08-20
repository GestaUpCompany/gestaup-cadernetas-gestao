CREATE OR REPLACE FUNCTION public.get_rastreio_cadernetas_detalhe(
  p_fazenda_id uuid,
  p_nome_usuario text DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE (
  nome_usuario text,
  caderneta text,
  dia date,
  total bigint,
  ativos bigint,
  deletados bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') AS nome_usuario,
    r.caderneta,
    (r.created_at AT TIME ZONE 'America/Cuiaba')::date AS dia,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE r.deleted_at IS NULL) AS ativos,
    COUNT(*) FILTER (WHERE r.deleted_at IS NOT NULL) AS deletados
  FROM public.v_registros_unificado r
  WHERE r.fazenda_id = p_fazenda_id
    AND (p_nome_usuario IS NULL OR COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)') = p_nome_usuario)
    AND (p_data_inicio IS NULL OR r.created_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR r.created_at < (p_data_fim + interval '1 day'))
  GROUP BY COALESCE(NULLIF(TRIM(r.nome_usuario), ''), '(sem nome)'), r.caderneta, dia
  ORDER BY dia, nome_usuario, caderneta;
$$;

GRANT EXECUTE ON FUNCTION public.get_rastreio_cadernetas_detalhe TO authenticated, anon;;
