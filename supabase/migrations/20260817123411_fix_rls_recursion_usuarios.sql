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

-- Recriar policies usando as funcoes helper (sem recursao)

-- usuarios: admins leem todos, usuario le proprio perfil
DROP POLICY IF EXISTS "Admins podem ler todos os usuarios" ON public.usuarios;

CREATE POLICY "Admins podem ler todos os usuarios" ON public.usuarios
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

-- usuario_fazenda: admins leem todos, usuario le das suas fazendas
DROP POLICY IF EXISTS "Admins podem ler todos os vinculos" ON public.usuario_fazenda;
DROP POLICY IF EXISTS "Usuarios podem ler vinculos das suas fazendas" ON public.usuario_fazenda;

CREATE POLICY "Admins podem ler todos os vinculos" ON public.usuario_fazenda
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Usuarios podem ler vinculos das suas fazendas" ON public.usuario_fazenda
  FOR SELECT TO authenticated
  USING (public.user_has_fazenda_access(usuario_fazenda.fazenda_id));

-- funcionarios: peao le da sua fazenda, usuario vinculado le da sua
DROP POLICY IF EXISTS "Peao pode ler funcionarios da sua fazenda" ON public.funcionarios;
DROP POLICY IF EXISTS "Usuario vinculado pode ler funcionarios da fazenda" ON public.funcionarios;

CREATE POLICY "Peao pode ler funcionarios da sua fazenda" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (public.get_peao_fazenda_id() = funcionarios.fazenda_id);

CREATE POLICY "Usuario vinculado pode ler funcionarios da fazenda" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (public.user_has_fazenda_access(funcionarios.fazenda_id));;
