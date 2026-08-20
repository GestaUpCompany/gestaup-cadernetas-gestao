CREATE EXTENSION IF NOT EXISTS pgrouting;

ALTER TABLE public.mapa_estradas
  ADD COLUMN IF NOT EXISTS source integer;
ALTER TABLE public.mapa_estradas
  ADD COLUMN IF NOT EXISTS target integer;

CREATE INDEX IF NOT EXISTS idx_mapa_estradas_source ON public.mapa_estradas(source);
CREATE INDEX IF NOT EXISTS idx_mapa_estradas_target ON public.mapa_estradas(target);

CREATE OR REPLACE FUNCTION public.validar_conectividade_estradas(
  p_fazenda_id uuid,
  p_tolerancia_m integer DEFAULT 5
)
RETURNS TABLE(
  estrada_id uuid,
  estrada_nome text,
  extremidade text,
  ponto json,
  proxima_estrada_id uuid,
  proxima_estrada_nome text,
  distancia_m double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tol_deg double precision;
BEGIN
  v_tol_deg := p_tolerancia_m::double precision / 111000.0;

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    CASE
      WHEN ST_DWithin(ST_StartPoint(e.geometria), e2.geometria, v_tol_deg) THEN 'inicio'
      ELSE 'fim'
    END AS extremidade,
    ST_AsGeoJSON(
      CASE
        WHEN ST_DWithin(ST_StartPoint(e.geometria), e2.geometria, v_tol_deg)
        THEN ST_StartPoint(e.geometria)
        ELSE ST_EndPoint(e.geometria)
      END
    )::json AS ponto,
    e2.id AS proxima_estrada_id,
    e2.nome AS proxima_estrada_nome,
    ST_Distance(
      CASE
        WHEN ST_DWithin(ST_StartPoint(e.geometria), e2.geometria, v_tol_deg)
        THEN ST_StartPoint(e.geometria)
        ELSE ST_EndPoint(e.geometria)
      END,
      e2.geometria
    ) * 111000.0 AS distancia_m
  FROM public.mapa_estradas e
  CROSS JOIN public.mapa_estradas e2
  WHERE e.fazenda_id = p_fazenda_id
    AND e.ativo = true
    AND e2.fazenda_id = p_fazenda_id
    AND e2.ativo = true
    AND e.id <> e2.id
    AND (
      ST_DWithin(ST_StartPoint(e.geometria), e2.geometria, v_tol_deg)
      OR ST_DWithin(ST_EndPoint(e.geometria), e2.geometria, v_tol_deg)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.detectar_gaps_estradas(
  p_fazenda_id uuid,
  p_tolerancia_m integer DEFAULT 5
)
RETURNS TABLE(
  estrada_id uuid,
  estrada_nome text,
  extremidade text,
  ponto json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tol_deg double precision;
BEGIN
  v_tol_deg := p_tolerancia_m::double precision / 111000.0;

  RETURN QUERY
  SELECT e.id, e.nome, 'inicio' AS extremidade,
    ST_AsGeoJSON(ST_StartPoint(e.geometria))::json AS ponto
  FROM public.mapa_estradas e
  WHERE e.fazenda_id = p_fazenda_id
    AND e.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.mapa_estradas e2
      WHERE e2.fazenda_id = p_fazenda_id
        AND e2.ativo = true
        AND e2.id <> e.id
        AND ST_DWithin(ST_StartPoint(e.geometria), e2.geometria, v_tol_deg)
    )
  UNION ALL
  SELECT e.id, e.nome, 'fim' AS extremidade,
    ST_AsGeoJSON(ST_EndPoint(e.geometria))::json AS ponto
  FROM public.mapa_estradas e
  WHERE e.fazenda_id = p_fazenda_id
    AND e.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.mapa_estradas e2
      WHERE e2.fazenda_id = p_fazenda_id
        AND e2.ativo = true
        AND e2.id <> e.id
        AND ST_DWithin(ST_EndPoint(e.geometria), e2.geometria, v_tol_deg)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.encontrar_rota(
  p_fazenda_id uuid,
  p_origem_geojson text,
  p_destino_geojson text,
  p_tolerancia_m integer DEFAULT 50
)
RETURNS TABLE(rota json, distancia_m double precision, encontrou boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_origem geometry;
  v_destino geometry;
  v_tol_deg double precision;
  v_start_vid bigint;
  v_end_vid bigint;
  v_rota geometry;
  v_dist double precision;
  v_estradas_count integer;
BEGIN
  v_origem := ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(p_origem_geojson)), 4326);
  v_destino := ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(p_destino_geojson)), 4326);
  v_tol_deg := p_tolerancia_m::double precision / 111000.0;

  -- Verificar se há estradas ativas para a fazenda
  SELECT count(*) INTO v_estradas_count
  FROM public.mapa_estradas
  WHERE fazenda_id = p_fazenda_id AND ativo = true;

  IF v_estradas_count = 0 THEN
    RETURN QUERY SELECT NULL::json, 0.0::double precision, false;
    RETURN;
  END IF;

  -- Recriar topologia (pgr_createTopology cria mapa_estradas_vertices_pgr se não existir)
  PERFORM pgr_createTopology('public.mapa_estradas', v_tol_deg, 'geometria', 'id');

  -- Encontrar vértices mais próximos da origem e destino
  SELECT v.id INTO v_start_vid
  FROM public.mapa_estradas_vertices_pgr v
  ORDER BY v.the_geom <-> v_origem
  LIMIT 1;

  SELECT v.id INTO v_end_vid
  FROM public.mapa_estradas_vertices_pgr v
  ORDER BY v.the_geom <-> v_destino
  LIMIT 1;

  IF v_start_vid IS NULL OR v_end_vid IS NULL THEN
    RETURN QUERY SELECT NULL::json, 0.0::double precision, false;
    RETURN;
  END IF;

  -- Construir rota com pgr_dijkstra
  SELECT ST_MakeLine(ST_MakePoint(ST_X(v.the_geom), ST_Y(v.the_geom))) INTO v_rota
  FROM pgr_dijkstra(
    'SELECT id, source, target, ST_Length(geometria::geography) AS cost, ST_Length(geometria::geography) AS reverse_cost FROM public.mapa_estradas WHERE ativo = true',
    v_start_vid,
    v_end_vid,
    false
  ) d
  JOIN public.mapa_estradas_vertices_pgr v ON v.id = d.node;

  IF v_rota IS NULL THEN
    RETURN QUERY SELECT NULL::json, 0.0::double precision, false;
    RETURN;
  END IF;

  v_dist := ST_Length(ST_SetSRID(v_rota, 4326)::geography);
  RETURN QUERY SELECT ST_AsGeoJSON(ST_SetSRID(v_rota, 4326))::json, v_dist, true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_conectividade_estradas(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detectar_gaps_estradas(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encontrar_rota(uuid, text, text, integer) TO authenticated;;
