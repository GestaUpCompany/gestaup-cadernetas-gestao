-- Migration: Corte C - Routing com pgRouting
-- Ativa pgRouting, adiciona colunas gid/source/target em mapa_estradas,
-- e cria RPCs para validação de conectividade, reconstrução de topologia
-- e caminho mais curto (single e multi-destino).

-- ==================== pgRouting ====================
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- ==================== mapa_estradas: colunas de topologia ====================
-- gid é necessário porque pgr_createTopology exige id integer (mapa_estradas.id é uuid).
-- source/target são preenchidos por pgr_createTopology via RPC reconstruir_topologia_estradas.
ALTER TABLE public.mapa_estradas
  ADD COLUMN IF NOT EXISTS gid serial;
ALTER TABLE public.mapa_estradas
  ADD COLUMN IF NOT EXISTS source integer;
ALTER TABLE public.mapa_estradas
  ADD COLUMN IF NOT EXISTS target integer;

CREATE INDEX IF NOT EXISTS idx_mapa_estradas_gid ON public.mapa_estradas(gid);
CREATE INDEX IF NOT EXISTS idx_mapa_estradas_source ON public.mapa_estradas(source);
CREATE INDEX IF NOT EXISTS idx_mapa_estradas_target ON public.mapa_estradas(target);

-- ==================== validar_conectividade_estradas ====================
-- Retorna pares de estradas cujas extremidades estão dentro da tolerância (conexões detectadas)
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

-- ==================== detectar_gaps_estradas ====================
-- Retorna extremidades de estradas que não conectam com nenhuma outra (gaps na rede)
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

-- ==================== reconstruir_topologia_estradas ====================
-- Constrói a topologia da rede de estradas manualmente em SQL puro.
-- Não usa pgr_createTopology porque essa função faz DDL internamente que
-- falha silenciosamente quando executada via PostgREST (HTTP).
-- Em vez disso: extrai endpoints das LineStrings, agrupa por proximidade,
-- atribui IDs sequenciais aos vértices, e seta source/target nas arestas.
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

  -- Garantir que a tabela de vértices existe
  CREATE TABLE IF NOT EXISTS public.mapa_estradas_vertices_pgr (
    id integer PRIMARY KEY,
    the_geom geometry(Point, 4326),
    cnt integer,
    chk integer
  );

  -- Limpar vértices antigos (WHERE obrigatória por safeupdate)
  DELETE FROM public.mapa_estradas_vertices_pgr WHERE id IS NOT NULL;

  -- Limpar source/target (WHERE obrigatória por extensão safeupdate do Supabase)
  UPDATE public.mapa_estradas SET source = NULL, target = NULL
  WHERE source IS NOT NULL OR target IS NOT NULL;

  -- Inserir todos os endpoints únicos (start e end de cada LineString).
  -- Pontos dentro da tolerância são agrupados via ST_SnapToGrid.
  INSERT INTO public.mapa_estradas_vertices_pgr (id, the_geom, cnt, chk)
  WITH endpoints AS (
    SELECT
      e.gid,
      ST_StartPoint(e.geometria) AS start_pt,
      ST_EndPoint(e.geometria) AS end_pt
    FROM public.mapa_estradas e
    WHERE e.ativo = true
  ),
  all_points AS (
    SELECT start_pt AS pt FROM endpoints
    UNION ALL
    SELECT end_pt AS pt FROM endpoints
  ),
  snapped AS (
    SELECT
      ST_SnapToGrid(pt, v_tol_deg) AS grid_pt,
      ST_Centroid(ST_Collect(pt)) AS the_geom,
      count(*) AS cnt
    FROM all_points
    GROUP BY ST_SnapToGrid(pt, v_tol_deg)
  )
  SELECT
    row_number() OVER (ORDER BY ST_X(grid_pt), ST_Y(grid_pt))::integer AS id,
    the_geom,
    cnt,
    1 AS chk
  FROM snapped;

  -- Setar source = ID do vértice mais próximo do StartPoint
  UPDATE public.mapa_estradas e
  SET source = sub.vid
  FROM (
    SELECT
      e2.gid,
      v.id AS vid
    FROM public.mapa_estradas e2
    CROSS JOIN LATERAL (
      SELECT v.id, v.the_geom
      FROM public.mapa_estradas_vertices_pgr v
      ORDER BY v.the_geom <-> ST_StartPoint(e2.geometria)
      LIMIT 1
    ) v
    WHERE e2.ativo = true
  ) sub
  WHERE e.gid = sub.gid;

  -- Setar target = ID do vértice mais próximo do EndPoint
  UPDATE public.mapa_estradas e
  SET target = sub.vid
  FROM (
    SELECT
      e2.gid,
      v.id AS vid
    FROM public.mapa_estradas e2
    CROSS JOIN LATERAL (
      SELECT v.id, v.the_geom
      FROM public.mapa_estradas_vertices_pgr v
      ORDER BY v.the_geom <-> ST_EndPoint(e2.geometria)
      LIMIT 1
    ) v
    WHERE e2.ativo = true
  ) sub
  WHERE e.gid = sub.gid;

  RETURN true;
END;
$$;

-- ==================== encontrar_rota ====================
-- Encontra o caminho mais curto entre dois pontos usando a rede de estradas.
-- Assume que reconstruir_topologia_estradas foi chamada antes.
-- Retorna a rota como LineString GeoJSON + distância total em metros.
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

  -- Verificar se há estradas ativas com topologia válida
  SELECT count(*) INTO v_estradas_count
  FROM public.mapa_estradas
  WHERE fazenda_id = p_fazenda_id AND ativo = true AND source IS NOT NULL AND target IS NOT NULL;

  IF v_estradas_count = 0 THEN
    RETURN QUERY SELECT NULL::json, 0.0::double precision, false;
    RETURN;
  END IF;

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

-- ==================== encontrar_rota_multi ====================
-- Encontra a rota otimizada visitando múltiplos destinos ( nearest-neighbor ).
-- O vagão sai da origem (fábrica) e visita todos os destinos (currais/cochos),
-- sempre indo para o destino mais próximo ainda não visitado.
-- Assume que reconstruir_topologia_estradas foi chamada antes.
-- Retorna a rota combinada como LineString GeoJSON + distância total + ordem de visita.
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

GRANT EXECUTE ON FUNCTION public.validar_conectividade_estradas(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detectar_gaps_estradas(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconstruir_topologia_estradas(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encontrar_rota(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encontrar_rota_multi(uuid, text, text, integer) TO authenticated;
