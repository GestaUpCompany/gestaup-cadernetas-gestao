-- Reescrever reconstruir_topologia_estradas sem pgr_createTopology.
-- pgr_createTopology faz DDL internamente e falha via PostgREST.
-- Em vez disso, construímos a topologia manualmente em SQL puro:
-- 1. Garantir que mapa_estradas_vertices_pgr existe
-- 2. Extrair todos os endpoints únicos das LineStrings
-- 3. Atribuir IDs sequenciais aos vértices
-- 4. Setar source/target em mapa_estradas matching start/end points

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

  -- Limpar vértices antigos
  DELETE FROM public.mapa_estradas_vertices_pgr;

  -- Limpar source/target (WHERE obrigatório por safeupdate)
  UPDATE public.mapa_estradas
  SET source = NULL, target = NULL
  WHERE source IS NOT NULL OR target IS NOT NULL;

  -- Inserir todos os endpoints únicos (start e end de cada LineString)
  -- Pontos dentro da tolerância são considerados o mesmo vértice.
  -- Usamos ST_SnapToGrid para agrupar pontos próximos.
  -- A tolerância em graus é ~m/111000, então arredondamos para essa precisão.
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
  -- Agrupar pontos próximos usando ST_SnapToGrid
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

GRANT EXECUTE ON FUNCTION public.reconstruir_topologia_estradas(uuid, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';;
