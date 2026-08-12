-- Migration: RPCs para o mapa da fazenda
-- get_pastos_com_geometria: retorna pastos com geometria não nula, com ST_AsGeoJSON
-- get_bebedouros_com_geometria: retorna bebedouros com geometria não nula, com ST_AsGeoJSON
-- salvar_geometria_pasto: salva GeoJSON no pasto, com validação ST_IsValid

-- ==================== get_pastos_com_geometria ====================
-- Retorna pastos da fazenda que têm geometria, com a geometria em GeoJSON
CREATE OR REPLACE FUNCTION public.get_pastos_com_geometria(p_fazenda_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  setor text,
  tipo text,
  area_total_ha numeric,
  area_util_ha numeric,
  especie text,
  ativo boolean,
  metragem_cocho_m numeric,
  possui_deposito boolean,
  fonte_agua_principal text,
  modulo_nome text,
  geometria_geojson text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.nome,
    p.setor,
    p.tipo,
    p.area_total_ha,
    p.area_util_ha,
    p.especie,
    p.ativo,
    p.metragem_cocho_m,
    p.possui_deposito,
    p.fonte_agua_principal,
    mp.nome AS modulo_nome,
    ST_AsGeoJSON(p.geometria)::text AS geometria_geojson
  FROM public.pastos p
  LEFT JOIN public.modulos_pastos mp ON mp.id = p.modulo_id
  WHERE p.fazenda_id = p_fazenda_id
    AND p.geometria IS NOT NULL
    AND p.deleted_at IS NULL
  ORDER BY p.nome;
$$;

-- ==================== get_bebedouros_com_geometria ====================
CREATE OR REPLACE FUNCTION public.get_bebedouros_com_geometria(p_fazenda_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  capacidade numeric,
  geometria_geojson text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    b.id,
    b.nome,
    b.capacidade,
    ST_AsGeoJSON(b.geometria)::text AS geometria_geojson
  FROM public.bebedouros b
  WHERE b.fazenda_id = p_fazenda_id
    AND b.geometria IS NOT NULL
    AND b.ativo = true
  ORDER BY b.nome;
$$;

-- ==================== salvar_geometria_pasto ====================
-- Salva geometria (GeoJSON Polygon) no pasto, com validação
-- Retorna true se salvou com sucesso
CREATE OR REPLACE FUNCTION public.salvar_geometria_pasto(
  p_pasto_id uuid,
  p_geometria_geojson text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geom geometry;
  v_valid boolean;
BEGIN
  -- Converter GeoJSON para geometry
  v_geom := ST_GeomFromGeoJSON(p_geometria_geojson);

  -- Garantir SRID 4326
  v_geom := ST_SetSRID(v_geom, 4326);

  -- Remover dimensão Z (KMLs do Google Earth trazem altitude)
  v_geom := ST_Force2D(v_geom);

  -- Validar geometria
  v_valid := ST_IsValid(v_geom);
  IF NOT v_valid THEN
    -- Tentar corrigir com ST_MakeValid e forçar 2D novamente
    v_geom := ST_Force2D(ST_MakeValid(v_geom));
    IF v_geom IS NULL OR NOT ST_IsValid(v_geom) THEN
      RAISE EXCEPTION 'Geometria inválida e não pôde ser corrigida com ST_MakeValid.';
    END IF;
  END IF;

  -- ST_MakeValid pode retornar MultiPolygon; garantir Polygon simples
  IF ST_GeometryType(v_geom) = 'ST_MultiPolygon' THEN
    v_geom := ST_GeometryN(v_geom, 1);
  END IF;

  -- Salvar no pasto
  UPDATE public.pastos
  SET geometria = v_geom::geometry(Polygon, 4326),
      updated_at = now()
  WHERE id = p_pasto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pasto não encontrado: %', p_pasto_id;
  END IF;

  RETURN true;
END;
$$;

-- ==================== salvar_geometria_bebedouro ====================
-- Salva geometria (GeoJSON Point) no bebedouro, com validação
CREATE OR REPLACE FUNCTION public.salvar_geometria_bebedouro(
  p_bebedouro_id uuid,
  p_geometria_geojson text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geom geometry;
  v_valid boolean;
BEGIN
  v_geom := ST_GeomFromGeoJSON(p_geometria_geojson);
  v_geom := ST_SetSRID(v_geom, 4326);
  v_geom := ST_Force2D(v_geom);

  v_valid := ST_IsValid(v_geom);
  IF NOT v_valid THEN
    v_geom := ST_Force2D(ST_MakeValid(v_geom));
    IF v_geom IS NULL OR NOT ST_IsValid(v_geom) THEN
      RAISE EXCEPTION 'Geometria inválida e não pôde ser corrigida com ST_MakeValid.';
    END IF;
  END IF;

  UPDATE public.bebedouros
  SET geometria = v_geom::geometry(Point, 4326),
      updated_at = now()
  WHERE id = p_bebedouro_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bebedouro não encontrado: %', p_bebedouro_id;
  END IF;

  RETURN true;
END;
$$;

-- ==================== Permissões ====================
-- As RPCs são SECURITY DEFINER, executam com privilégios do owner.
-- O filtro por fazenda_id dentro das funções garante o isolamento.
-- RLS das tabelas subjacentes (pastos, bebedouros) continua ativa.

-- ==================== encontrar_pasto_por_ponto ====================
-- Dado um ponto (GeoJSON Point), encontra o pasto que o contém (ST_Contains)
-- Usado ao marcar bebedouro: o sistema detecta automaticamente em qual pasto o ponto caiu
CREATE OR REPLACE FUNCTION public.encontrar_pasto_por_ponto(
  p_fazenda_id uuid,
  p_ponto_geojson text
)
RETURNS TABLE (
  id uuid,
  nome text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id, p.nome
  FROM public.pastos p
  WHERE p.fazenda_id = p_fazenda_id
    AND p.geometria IS NOT NULL
    AND p.deleted_at IS NULL
    AND ST_Contains(p.geometria, ST_SetSRID(ST_GeomFromGeoJSON(p_ponto_geojson), 4326))
  LIMIT 1;
$$;

-- Garantir que o owner das funções tem acesso às tabelas
GRANT EXECUTE ON FUNCTION public.get_pastos_com_geometria(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bebedouros_com_geometria(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_geometria_bebedouro(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_geometria_pasto(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encontrar_pasto_por_ponto(uuid, text) TO authenticated;

-- ==================== remover_geometria_pasto ====================
CREATE OR REPLACE FUNCTION public.remover_geometria_pasto(p_pasto_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.pastos SET geometria = NULL, updated_at = now() WHERE id = p_pasto_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pasto não encontrado: %', p_pasto_id;
  END IF;
  RETURN true;
END;
$$;

-- ==================== remover_geometria_bebedouro ====================
CREATE OR REPLACE FUNCTION public.remover_geometria_bebedouro(p_bebedouro_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bebedouros SET geometria = NULL, updated_at = now() WHERE id = p_bebedouro_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bebedouro não encontrado: %', p_bebedouro_id;
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remover_geometria_pasto(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_geometria_bebedouro(uuid) TO authenticated;

-- ==================== remover_geometrias_lote ====================
-- Remove geometrias de múltiplos pastos de uma vez.
-- Opcionalmente remove também as geometrias dos bebedouros associados a esses pastos.
-- Retorna contagem de pastos e bebedouros removidos.
CREATE OR REPLACE FUNCTION public.remover_geometrias_lote(
  p_pasto_ids uuid[],
  p_remover_bebedouros boolean DEFAULT false
)
RETURNS TABLE (pastos_removidos integer, bebedouros_removidos integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pastos_count integer;
  v_bebedouros_count integer;
  v_bebedouro_ids uuid[];
BEGIN
  -- Remover geometrias dos pastos
  UPDATE public.pastos
  SET geometria = NULL, updated_at = now()
  WHERE id = ANY(p_pasto_ids) AND geometria IS NOT NULL;

  GET DIAGNOSTICS v_pastos_count = ROW_COUNT;

  -- Opcionalmente remover geometrias dos bebedouros associados
  IF p_remover_bebedouros THEN
    -- Coletar IDs de bebedouros associados aos pastos selecionados
    SELECT array_agg(DISTINCT pb.bebedouro_id)
    INTO v_bebedouro_ids
    FROM public.pasto_bebedouros pb
    WHERE pb.pasto_id = ANY(p_pasto_ids);

    IF v_bebedouro_ids IS NOT NULL THEN
      UPDATE public.bebedouros
      SET geometria = NULL, updated_at = now()
      WHERE id = ANY(v_bebedouro_ids) AND geometria IS NOT NULL;

      GET DIAGNOSTICS v_bebedouros_count = ROW_COUNT;
    ELSE
      v_bebedouros_count := 0;
    END IF;
  ELSE
    v_bebedouros_count := 0;
  END IF;

  RETURN QUERY SELECT v_pastos_count, v_bebedouros_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remover_geometrias_lote(uuid[], boolean) TO authenticated;

-- ==================== get_lote_por_pasto ====================
-- Retorna o lote associado a um pasto (via lotes.pasto_id) com dados reais:
-- cabeças atual = soma de lote_categorias.quant_atual (ativo=true)
-- peso médio = média ponderada de peso_vivo_atual_kg_cab das categorias ativas
CREATE OR REPLACE FUNCTION public.get_lote_por_pasto(p_pasto_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  cabecas_atual bigint,
  raca text,
  sexo text,
  peso_medio_atual_kg numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    l.id,
    l.nome,
    COALESCE((
      SELECT SUM(lc.quant_atual)
      FROM lote_categorias lc
      WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0
    ), 0) AS cabecas_atual,
    l.raca,
    l.sexo,
    CASE
      WHEN COALESCE((
        SELECT SUM(lc.quant_atual)
        FROM lote_categorias lc
        WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0
      ), 0) > 0
      THEN round(
        COALESCE((
          SELECT SUM(lc.quant_atual * lc.peso_vivo_atual_kg_cab)
          FROM lote_categorias lc
          WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0 AND lc.peso_vivo_atual_kg_cab IS NOT NULL
        ), 0) /
        COALESCE((
          SELECT SUM(lc.quant_atual)
          FROM lote_categorias lc
          WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0 AND lc.peso_vivo_atual_kg_cab IS NOT NULL
        ), 1),
        2
      )
      ELSE NULL
    END AS peso_medio_atual_kg
  FROM lotes l
  WHERE l.pasto_id = p_pasto_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_lote_por_pasto(uuid) TO authenticated;

-- ==================== salvar_estrada ====================
-- Cria uma nova estrada (LineString) na fazenda
CREATE OR REPLACE FUNCTION public.salvar_estrada(
  p_fazenda_id uuid,
  p_nome text,
  p_geometria_geojson text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geom geometry;
  v_valid boolean;
  v_id uuid;
BEGIN
  v_geom := ST_GeomFromGeoJSON(p_geometria_geojson);
  v_geom := ST_SetSRID(v_geom, 4326);
  v_geom := ST_Force2D(v_geom);

  v_valid := ST_IsValid(v_geom);
  IF NOT v_valid THEN
    v_geom := ST_Force2D(ST_MakeValid(v_geom));
    IF v_geom IS NULL OR NOT ST_IsValid(v_geom) THEN
      RAISE EXCEPTION 'Geometria inválida e não pôde ser corrigida.';
    END IF;
  END IF;

  INSERT INTO public.mapa_estradas (fazenda_id, nome, geometria)
  VALUES (p_fazenda_id, p_nome, v_geom::geometry(LineString, 4326))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ==================== atualizar_estrada ====================
-- Atualiza nome e/ou geometria de uma estrada existente
CREATE OR REPLACE FUNCTION public.atualizar_estrada(
  p_estrada_id uuid,
  p_nome text DEFAULT NULL,
  p_geometria_geojson text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geom geometry;
BEGIN
  IF p_geometria_geojson IS NOT NULL THEN
    v_geom := ST_GeomFromGeoJSON(p_geometria_geojson);
    v_geom := ST_SetSRID(v_geom, 4326);
    v_geom := ST_Force2D(v_geom);

    IF NOT ST_IsValid(v_geom) THEN
      v_geom := ST_Force2D(ST_MakeValid(v_geom));
      IF v_geom IS NULL OR NOT ST_IsValid(v_geom) THEN
        RAISE EXCEPTION 'Geometria inválida.';
      END IF;
    END IF;

    UPDATE public.mapa_estradas
    SET geometria = v_geom::geometry(LineString, 4326), updated_at = now()
    WHERE id = p_estrada_id;
  END IF;

  IF p_nome IS NOT NULL THEN
    UPDATE public.mapa_estradas
    SET nome = p_nome, updated_at = now()
    WHERE id = p_estrada_id;
  END IF;

  RETURN true;
END;
$$;

-- ==================== remover_estrada ====================
-- Remove uma estrada do mapa
CREATE OR REPLACE FUNCTION public.remover_estrada(p_estrada_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.mapa_estradas WHERE id = p_estrada_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estrada não encontrada: %', p_estrada_id;
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salvar_estrada(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_estrada(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_estrada(uuid) TO authenticated;

-- ==================== salvar_ponto ====================
-- Cria um novo ponto de interesse (fábrica, curral, portão, saleiro, cocho, etc.)
CREATE OR REPLACE FUNCTION public.salvar_ponto(
  p_fazenda_id uuid,
  p_tipo text,
  p_nome text,
  p_geometria_geojson text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geom geometry;
  v_id uuid;
BEGIN
  v_geom := ST_GeomFromGeoJSON(p_geometria_geojson);
  v_geom := ST_SetSRID(v_geom, 4326);
  v_geom := ST_Force2D(v_geom);

  IF NOT ST_IsValid(v_geom) THEN
    v_geom := ST_Force2D(ST_MakeValid(v_geom));
    IF v_geom IS NULL OR NOT ST_IsValid(v_geom) THEN
      RAISE EXCEPTION 'Geometria inválida.';
    END IF;
  END IF;

  INSERT INTO public.mapa_pontos (fazenda_id, tipo, nome, geometria)
  VALUES (p_fazenda_id, p_tipo, p_nome, v_geom::geometry(Point, 4326))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ==================== atualizar_ponto ====================
CREATE OR REPLACE FUNCTION public.atualizar_ponto(
  p_ponto_id uuid,
  p_tipo text DEFAULT NULL,
  p_nome text DEFAULT NULL,
  p_geometria_geojson text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geom geometry;
BEGIN
  IF p_geometria_geojson IS NOT NULL THEN
    v_geom := ST_GeomFromGeoJSON(p_geometria_geojson);
    v_geom := ST_SetSRID(v_geom, 4326);
    v_geom := ST_Force2D(v_geom);

    IF NOT ST_IsValid(v_geom) THEN
      v_geom := ST_Force2D(ST_MakeValid(v_geom));
      IF v_geom IS NULL OR NOT ST_IsValid(v_geom) THEN
        RAISE EXCEPTION 'Geometria inválida.';
      END IF;
    END IF;

    UPDATE public.mapa_pontos
    SET geometria = v_geom::geometry(Point, 4326), updated_at = now()
    WHERE id = p_ponto_id;
  END IF;

  IF p_tipo IS NOT NULL THEN
    UPDATE public.mapa_pontos SET tipo = p_tipo, updated_at = now() WHERE id = p_ponto_id;
  END IF;

  IF p_nome IS NOT NULL THEN
    UPDATE public.mapa_pontos SET nome = p_nome, updated_at = now() WHERE id = p_ponto_id;
  END IF;

  RETURN true;
END;
$$;

-- ==================== remover_ponto ====================
CREATE OR REPLACE FUNCTION public.remover_ponto(p_ponto_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.mapa_pontos WHERE id = p_ponto_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ponto não encontrado: %', p_ponto_id;
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salvar_ponto(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_ponto(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_ponto(uuid) TO authenticated;
