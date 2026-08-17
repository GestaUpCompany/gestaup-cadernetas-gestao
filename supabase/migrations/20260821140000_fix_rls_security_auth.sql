-- =====================================================
-- B1: Remover RLS pública de peoes + criar RPC autenticacao
-- =====================================================

-- Dropa a policy que permite anon ler todos os peoes ativos
DROP POLICY IF EXISTS "Peões ativos podem ser lidos" ON public.peoes;

-- RPC que retorna dados do peao para um acesso_id especifico.
-- SECURITY DEFINER para poder ler peoes sem RLS bloqueando.
-- Executavel por anon porque o PWA nao esta autenticado ainda.
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

-- =====================================================
-- Funcoes helper SECURITY DEFINER para evitar recursao de RLS
-- =====================================================

-- Checa se o usuario atual (auth.uid()) e admin ou super_admin.
-- SECURITY DEFINER bypassa RLS de usuarios, evitando recursao infinita.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.papel IN ('admin', 'super_admin')
      AND u.ativo = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- Checa se o usuario atual tem vinculo ativo com uma fazenda especifica.
-- SECURITY DEFINER bypassa RLS de usuario_fazenda e usuarios.
CREATE OR REPLACE FUNCTION public.user_has_fazenda_access(p_fazenda_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario_fazenda uf
    JOIN public.usuarios u ON u.id = uf.usuario_id
    WHERE uf.usuario_id = auth.uid()
      AND uf.fazenda_id = p_fazenda_id
      AND uf.ativo = true
      AND u.ativo = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_fazenda_access(uuid) TO authenticated;

-- Retorna o fazenda_id (uuid) do peao logado via auth.uid().
-- Mapeia auth.uid() -> auth.users.email -> peoes.email -> peoes.fazenda_id -> fazendas.id
CREATE OR REPLACE FUNCTION public.get_peao_fazenda_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id
  FROM public.peoes p
  JOIN auth.users au ON au.email = p.email
  JOIN public.fazendas f ON f.acesso_id = p.fazenda_id
  WHERE au.id = auth.uid()
    AND p.ativo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_peao_fazenda_id() TO authenticated;

-- =====================================================
-- B2: Remover "Allow public read access" de usuarios
-- =====================================================

DROP POLICY IF EXISTS "Allow public read access" ON public.usuarios;

-- Admins/super_admins podem ler todos os usuarios (usa funcao helper, sem recursao)
CREATE POLICY "Admins podem ler todos os usuarios" ON public.usuarios
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

-- =====================================================
-- B3: Tighten RLS de funcionarios para filtrar por fazenda
-- =====================================================

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.funcionarios;
DROP POLICY IF EXISTS "Usuários autenticados podem ler funcionários" ON public.funcionarios;

-- Peao (PWA) pode ler funcionarios da sua fazenda (usa funcao helper)
CREATE POLICY "Peao pode ler funcionarios da sua fazenda" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (public.get_peao_fazenda_id() = funcionarios.fazenda_id);

-- Controller/Admin (Painel Web) pode ler funcionarios das fazendas vinculadas
CREATE POLICY "Usuario vinculado pode ler funcionarios da fazenda" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (public.user_has_fazenda_access(funcionarios.fazenda_id));

-- =====================================================
-- B4: Tighten RLS de usuario_fazenda
-- =====================================================

DROP POLICY IF EXISTS "Authenticated select usuario_fazenda" ON public.usuario_fazenda;

-- Admins podem ler todos os vinculos (usa funcao helper, sem recursao)
CREATE POLICY "Admins podem ler todos os vinculos" ON public.usuario_fazenda
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

-- Usuarios podem ler vinculos das fazendas as quais estao vinculados
-- (mais amplo que apenas "meus vinculos", permite controller ver outros da mesma fazenda)
CREATE POLICY "Usuarios podem ler vinculos das suas fazendas" ON public.usuario_fazenda
  FOR SELECT TO authenticated
  USING (public.user_has_fazenda_access(usuario_fazenda.fazenda_id));
