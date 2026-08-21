-- RPC separada para reconstruir topologia.
-- pgr_createTopology faz DDL internamente, que pode falhar dentro de
-- uma função SECURITY DEFINER chamada via PostgREST.
CREATE OR REPLACE FUNCTION public.reconstruir_topologia_estradas(
  p_fazenda_id uuid,
  p_tolerancia_m integer DEFAULT 50
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tol_deg double precision;
  v_estradas_count integer;
BEGIN
  v_tol_deg := p_tolerancia_m::double precision / 111000.0;

  SELECT count(*) INTO v_estradas_count
  FROM public.mapa_estradas
  WHERE fazenda_id = p_fazenda_id AND ativo = true;

  IF v_estradas_count = 0 THEN
    RETURN false;
  END IF;

  -- Limpar source/target antes de recriar
  UPDATE public.mapa_estradas SET source = NULL, target = NULL;

  -- Recriar topologia
  PERFORM pgr_createTopology(
    'public.mapa_estradas',
    v_tol_deg,
    'geometria',
    'gid',
    'source',
    'target',
    'true',
    true
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconstruir_topologia_estradas(uuid, integer) TO authenticated;

-- Reescrever encontrar_rota SEM pgr_createTopology dentro.
-- Assume que reconstruir_topologia_estradas foi chamada antes.
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
  v_start_vid bigint;
  v_end_vid bigint;
  v_rota geometry;
  v_dist double precision;
  v_estradas_count integer;
BEGIN
  v_origem := ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(p_origem_geojson)), 4326);
  v_destino := ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(p_destino_geojson)), 4326);

  SELECT count(*) INTO v_estradas_count
  FROM public.mapa_estradas
  WHERE fazenda_id = p_fazenda_id AND ativo = true AND source IS NOT NULL AND target IS NOT NULL;

  IF v_estradas_count = 0 THEN
    RETURN QUERY SELECT NULL::json, 0.0::double precision, false;
    RETURN;
  END IF;

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

  SELECT ST_MakeLine(ST_MakePoint(ST_X(v.the_geom), ST_Y(v.the_geom))) INTO v_rota
  FROM pgr_dijkstra(
    'SELECT gid AS id, source, target, ST_Length(geometria::geography) AS cost, ST_Length(geometria::geography) AS reverse_cost FROM public.mapa_estradas WHERE ativo = true AND source IS NOT NULL AND target IS NOT NULL',
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

-- Reescrever encontrar_rota_multi SEM pgr_createTopology dentro.
CREATE OR REPLACE FUNCTION public.encontrar_rota_multi(
  p_fazenda_id uuid,
  p_origem_geojson text,
  p_destinos_geojson text,
  p_tolerancia_m integer DEFAULT 50
)
RETURNS TABLE(rota json, distancia_m double precision, encontrou boolean, ordem_visita json)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_origem geometry;
  v_estradas_count integer;
  v_destinos geometry[];
  v_destino geometry;
  v_n_destinos integer;
  v_visitados boolean[];
  v_atual geometry;
  v_atual_vid bigint;
  v_prox_vid bigint;
  v_prox_dist double precision;
  v_melhor_idx integer;
  v_melhor_dist double precision;
  v_trecho_rota geometry;
  v_trecho_dist double precision;
  v_rota_completa geometry;
  v_dist_total double precision;
  v_ordem integer[];
  v_i integer;
  v_j integer;
  v_json_destinos json;
  v_destino_item json;
  v_ordem_visita json;
BEGIN
  v_origem := ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(p_origem_geojson)), 4326);
  v_json_destinos := p_destinos_geojson::json;
  v_n_destinos := jsonb_array_length(v_json_destinos::jsonb);

  SELECT count(*) INTO v_estradas_count
  FROM public.mapa_estradas
  WHERE fazenda_id = p_fazenda_id AND ativo = true AND source IS NOT NULL AND target IS NOT NULL;

  IF v_estradas_count = 0 OR v_n_destinos = 0 THEN
    RETURN QUERY SELECT NULL::json, 0.0::double precision, false, '[]'::json;
    RETURN;
  END IF;

  v_destinos := ARRAY[]::geometry[];
  v_visitados := ARRAY[]::boolean[];
  FOR v_i IN 0..v_n_destinos - 1 LOOP
    v_destino_item := v_json_destinos->v_i;
    v_destino := ST_SetSRID(ST_Force2D(ST_GeomFromGeoJSON(v_destino_item::text)), 4326);
    v_destinos := array_append(v_destinos, v_destino);
    v_visitados := array_append(v_visitados, false);
  END LOOP;

  v_atual := v_origem;
  v_rota_completa := NULL;
  v_dist_total := 0;
  v_ordem := ARRAY[]::integer[];

  FOR v_i IN 1..v_n_destinos LOOP
    SELECT v.id INTO v_atual_vid
    FROM public.mapa_estradas_vertices_pgr v
    ORDER BY v.the_geom <-> v_atual
    LIMIT 1;

    IF v_atual_vid IS NULL THEN
      RETURN QUERY SELECT NULL::json, 0.0::double precision, false, '[]'::json;
      RETURN;
    END IF;

    v_melhor_idx := -1;
    v_melhor_dist := 1e18;
    FOR v_j IN 1..v_n_destinos LOOP
      IF NOT v_visitados[v_j] THEN
        v_prox_dist := ST_Distance(v_atual::geography, v_destinos[v_j]::geography);
        IF v_prox_dist < v_melhor_dist THEN
          v_melhor_dist := v_prox_dist;
          v_melhor_idx := v_j;
        END IF;
      END IF;
    END LOOP;

    IF v_melhor_idx = -1 THEN
      EXIT;
    END IF;

    SELECT v.id INTO v_prox_vid
    FROM public.mapa_estradas_vertices_pgr v
    ORDER BY v.the_geom <-> v_destinos[v_melhor_idx]
    LIMIT 1;

    IF v_prox_vid IS NULL THEN
      RETURN QUERY SELECT NULL::json, 0.0::double precision, false, '[]'::json;
      RETURN;
    END IF;

    SELECT ST_MakeLine(ST_MakePoint(ST_X(v.the_geom), ST_Y(v.the_geom))) INTO v_trecho_rota
    FROM pgr_dijkstra(
      'SELECT gid AS id, source, target, ST_Length(geometria::geography) AS cost, ST_Length(geometria::geography) AS reverse_cost FROM public.mapa_estradas WHERE ativo = true AND source IS NOT NULL AND target IS NOT NULL',
      v_atual_vid,
      v_prox_vid,
      false
    ) d
    JOIN public.mapa_estradas_vertices_pgr v ON v.id = d.node;

    IF v_trecho_rota IS NOT NULL THEN
      IF v_rota_completa IS NULL THEN
        v_rota_completa := v_trecho_rota;
      ELSE
        v_rota_completa := ST_LineMerge(ST_Union(v_rota_completa, v_trecho_rota));
      END IF;
      v_trecho_dist := ST_Length(ST_SetSRID(v_trecho_rota, 4326)::geography);
      v_dist_total := v_dist_total + v_trecho_dist;
    END IF;

    v_visitados[v_melhor_idx] := true;
    v_ordem := array_append(v_ordem, v_melhor_idx);
    v_atual := v_destinos[v_melhor_idx];
  END LOOP;

  IF v_rota_completa IS NULL THEN
    RETURN QUERY SELECT NULL::json, 0.0::double precision, false, '[]'::json;
    RETURN;
  END IF;

  SELECT json_agg(i) INTO v_ordem_visita
  FROM unnest(v_ordem) AS i;

  RETURN QUERY SELECT
    ST_AsGeoJSON(ST_SetSRID(v_rota_completa, 4326))::json,
    v_dist_total,
    true,
    COALESCE(v_ordem_visita, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.encontrar_rota(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encontrar_rota_multi(uuid, text, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';;
