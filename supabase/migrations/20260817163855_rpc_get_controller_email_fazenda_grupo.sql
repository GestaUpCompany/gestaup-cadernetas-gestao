-- RPC para buscar o email do controller de uma fazenda destino,
-- validando que a fazenda destino pertence ao mesmo grupo da fazenda atual.
-- Bypassa RLS de usuario_fazenda com SECURITY DEFINER, mas so retorna o email
-- se as duas fazendas estiverem no mesmo grupo.

CREATE OR REPLACE FUNCTION public.get_controller_email_fazenda_grupo(
  p_fazenda_origem_id uuid,
  p_fazenda_destino_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_grupo_origem uuid;
  v_grupo_destino uuid;
  v_email text;
BEGIN
  -- Buscar grupo da fazenda de origem
  SELECT grupo_id INTO v_grupo_origem
  FROM public.fazendas
  WHERE id = p_fazenda_origem_id AND ativo = true;

  IF v_grupo_origem IS NULL THEN
    RETURN NULL;
  END IF;

  -- Buscar grupo da fazenda de destino
  SELECT grupo_id INTO v_grupo_destino
  FROM public.fazendas
  WHERE id = p_fazenda_destino_id AND ativo = true;

  -- Validar que estao no mesmo grupo
  IF v_grupo_destino IS NULL OR v_grupo_destino <> v_grupo_origem THEN
    RETURN NULL;
  END IF;

  -- Buscar o email do controller da fazenda de destino
  SELECT u.email INTO v_email
  FROM public.usuario_fazenda uf
  JOIN public.usuarios u ON u.id = uf.usuario_id
  WHERE uf.fazenda_id = p_fazenda_destino_id
    AND uf.ativo = true
    AND u.ativo = true
  LIMIT 1;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_controller_email_fazenda_grupo(uuid, uuid) TO authenticated;;
