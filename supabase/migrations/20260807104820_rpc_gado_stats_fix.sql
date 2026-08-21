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
                 'nome', nome,
                 'cabecas', cabecas
               ) ORDER BY nome)
               FROM (
                 SELECT l.nome,
                        COALESCE(SUM(COALESCE(lc.quant_atual, lc.quant_inicial, 0)), 0) AS cabecas
                 FROM lotes l
                 LEFT JOIN lote_categorias lc ON lc.lote_id = l.id AND lc.ativo = true
                 WHERE l.fazenda_id = p_fazenda_id AND l.ativo = true AND l.deleted_at IS NULL
                 GROUP BY l.id, l.nome
               ) lotes_agg), '[]'::jsonb),
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

GRANT EXECUTE ON FUNCTION public.get_gado_stats(uuid) TO authenticated;;
