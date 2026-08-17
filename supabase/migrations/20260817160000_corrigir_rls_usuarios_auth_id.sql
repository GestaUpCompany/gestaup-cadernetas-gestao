-- =====================================================
-- Corrigir RLS de usuarios para considerar auth_id alem de id
-- =====================================================
-- Causa: a policy "Users can view own profile" comparava apenas a
-- coluna `id` (PK da tabela usuarios) com auth.uid(). Para a maioria
-- dos usuarios id = auth_id, mas 3 usuarios no banco tem id <> auth_id
-- (controller.gestaup@gmail.com, peao.arua, peao.chibata), fazendo a
-- policy permissive falhar e RLS bloquear a leitura mesmo com
-- current_user_has_access() = true.
--
-- A policy restrictive "require_active_access" combina com AND, entao
-- (false OR false) AND true = false, bloqueando o login.
--
-- Correcao: usar (id = auth.uid() OR auth_id = auth.uid()) nas
-- policies permissive de SELECT/UPDATE e em is_admin_user(), mantendo
-- compatibilidade com usuarios onde id = auth_id e cobrindo os casos
-- onde id <> auth_id.
-- =====================================================

-- 1) Funcao is_admin_user(): considerar auth_id alem de id
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE (u.id = auth.uid() OR u.auth_id = auth.uid())
      AND u.papel IN ('admin', 'super_admin')
      AND u.ativo = true
  );
$$;

-- 2) Policy "Users can view own profile": considerar auth_id alem de id
DROP POLICY IF EXISTS "Users can view own profile" ON public.usuarios;

CREATE POLICY "Users can view own profile" ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR auth_id = auth.uid());

-- 3) Policy "Users can update own profile": considerar auth_id alem de id
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuarios;

CREATE POLICY "Users can update own profile" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR auth_id = auth.uid());
