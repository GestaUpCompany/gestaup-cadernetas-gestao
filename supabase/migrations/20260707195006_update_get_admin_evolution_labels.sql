
DROP FUNCTION IF EXISTS public.get_admin_evolution(TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_admin_evolution(start_date TIMESTAMPTZ)
RETURNS TABLE (
  month TEXT,
  fazendas BIGINT,
  usuarios BIGINT,
  individuos BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', start_date::timestamptz),
      date_trunc('month', NOW()),
      interval '1 month'
    ) AS month_start
  )
  SELECT
    to_char(m.month_start, 'YYYY-MM') AS month,
    COALESCE((SELECT COUNT(*) FROM fazendas WHERE date_trunc('month', created_at) = m.month_start), 0)::BIGINT AS fazendas,
    COALESCE((SELECT COUNT(*) FROM usuarios WHERE date_trunc('month', created_at) = m.month_start), 0)::BIGINT AS usuarios,
    COALESCE((SELECT COUNT(*) FROM individuos WHERE date_trunc('month', created_at) = m.month_start), 0)::BIGINT AS individuos
  FROM months m
  ORDER BY m.month_start;
$$;
;
