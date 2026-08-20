-- B1: Dropa policy publica de peoes
DROP POLICY IF EXISTS "Peões ativos podem ser lidos" ON public.peoes;

-- B1: RPC para autenticar peao por acesso_id
CREATE OR REPLACE FUNCTION public.autenticar_peao_app(p_acesso_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peao record;
  v_fazenda record;
BEGIN
  SELECT p.email, p.password
  INTO v_peao
  FROM public.peoes p
  WHERE p.fazenda_id = p_acesso_id
    AND p.ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Peao nao encontrado');
  END IF;

  SELECT f.id, f.nome, f.logo_url
  INTO v_fazenda
  FROM public.fazendas f
  WHERE f.acesso_id = p_acesso_id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_peao.email,
    'password', v_peao.password,
    'fazenda_id', v_fazenda.id,
    'fazenda_nome', v_fazenda.nome,
    'logo_url', v_fazenda.logo_url
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.autenticar_peao_app(text) TO anon, authenticated;

-- B2: Remover public read de usuarios
DROP POLICY IF EXISTS "Allow public read access" ON public.usuarios;

CREATE POLICY "Admins podem ler todos os usuarios" ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.papel IN ('admin', 'super_admin')
        AND u.ativo = true
    )
  );

-- B3: Tighten funcionarios RLS
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.funcionarios;
DROP POLICY IF EXISTS "Usuários autenticados podem ler funcionários" ON public.funcionarios;

CREATE POLICY "Peao pode ler funcionarios da sua fazenda" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.peoes p
      JOIN auth.users au ON au.email = p.email
      JOIN public.fazendas f ON f.acesso_id = p.fazenda_id
      WHERE au.id = auth.uid()
        AND f.id = funcionarios.fazenda_id
    )
  );

CREATE POLICY "Usuario vinculado pode ler funcionarios da fazenda" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE uf.usuario_id = auth.uid()
        AND uf.fazenda_id = funcionarios.fazenda_id
        AND uf.ativo = true
        AND u.ativo = true
    )
  );

-- B4: Tighten usuario_fazenda RLS
DROP POLICY IF EXISTS "Authenticated select usuario_fazenda" ON public.usuario_fazenda;

CREATE POLICY "Admins podem ler todos os vinculos" ON public.usuario_fazenda
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.papel IN ('admin', 'super_admin')
        AND u.ativo = true
    )
  );

CREATE POLICY "Usuarios podem ler vinculos das suas fazendas" ON public.usuario_fazenda
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuario_fazenda uf2
      JOIN public.usuarios u2 ON u2.id = uf2.usuario_id
      WHERE uf2.usuario_id = auth.uid()
        AND uf2.fazenda_id = usuario_fazenda.fazenda_id
        AND uf2.ativo = true
        AND u2.ativo = true
    )
  );;
