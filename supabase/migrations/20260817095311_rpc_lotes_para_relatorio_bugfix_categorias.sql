CREATE OR REPLACE FUNCTION public.get_lotes_para_relatorio(
  p_fazenda_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
AS $function$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'lote_id', l.id,
      'nome', l.nome,
      'ativo', l.ativo,
      'n_cabecas', COALESCE((
        SELECT SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0))
        FROM lote_categorias lc
        WHERE lc.lote_id = l.id AND lc.ativo = true
      ), 0),
      'categorias', COALESCE((
        SELECT string_agg(DISTINCT lc.categoria, ', ')
        FROM lote_categorias lc
        WHERE lc.lote_id = l.id AND lc.ativo = true
      ), null),
      'pasto_nome', p.nome,
      'data_criacao', to_char(l.created_at, 'YYYY-MM-DD'),
      'tem_movimentacao', EXISTS (
        SELECT 1 FROM registros_movimentacao r
        WHERE r.fazenda_id = p_fazenda_id AND r.deleted_at IS NULL
          AND (r.lote_origem_id = l.id OR r.lote_destino_id = l.id)
      ),
      'tem_morte', EXISTS (
        SELECT 1 FROM registros_morte r
        WHERE r.fazenda_id = p_fazenda_id AND r.lote_id = l.id AND r.deleted_at IS NULL
      ),
      'tem_consumo', EXISTS (
        SELECT 1 FROM registros_suplementacao r
        WHERE r.fazenda_id = p_fazenda_id AND r.lote_id = l.id AND r.deleted_at IS NULL
      )
    ) ORDER BY l.ativo DESC, l.nome ASC)
    FROM lotes l
    LEFT JOIN pastos p ON p.id = l.pasto_id
    WHERE l.fazenda_id = p_fazenda_id
      AND l.deleted_at IS NULL
  ), '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_lotes_para_relatorio(uuid) TO authenticated;;
