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

  -- Limpar source/target antes de recriar (WHERE necessária por safeupdate)
  UPDATE public.mapa_estradas SET source = NULL, target = NULL
  WHERE source IS NOT NULL OR target IS NOT NULL;

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

NOTIFY pgrst, 'reload schema';;
