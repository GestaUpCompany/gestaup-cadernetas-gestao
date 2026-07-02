-- ============================================================================
-- MIGRAÇÃO - Função recursiva para buscar descendentes de um indivíduo
-- ============================================================================
-- Retorna todos os IDs que são descendentes diretos ou indiretos do indivíduo
-- informado (filhos, netos, bisnetos, etc.), considerando campos pai e mae.
-- Usada para evitar ciclos na árvore genealógica e para futura árvore completa.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_descendentes_individuo(p_individuo_id uuid)
RETURNS TABLE(descendente_id uuid, profundidade integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE descendentes AS (
    SELECT i.id AS descendente_id, 1 AS profundidade
    FROM public.individuos i
    WHERE i.deleted_at IS NULL
      AND (i.pai = p_individuo_id OR i.mae = p_individuo_id)

    UNION ALL

    SELECT i.id, d.profundidade + 1
    FROM public.individuos i
    JOIN descendentes d ON i.pai = d.descendente_id OR i.mae = d.descendente_id
    WHERE i.deleted_at IS NULL
      AND d.profundidade < 100
  )
  SELECT DISTINCT descendente_id, MIN(profundidade) AS profundidade
  FROM descendentes
  GROUP BY descendente_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_descendentes_individuo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_descendentes_individuo(uuid) TO anon;
