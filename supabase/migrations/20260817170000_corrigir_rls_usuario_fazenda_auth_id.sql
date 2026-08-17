-- =====================================================
-- Corrigir RLS de usuario_fazenda e tabelas dependentes
-- =====================================================
-- Continuação da correção de 20260817160000.
-- Causa: a função user_has_fazenda_access() e diversas policies
-- em 9 tabelas comparavam usuario_id (que guarda usuarios.id)
-- com auth.uid() (que retorna auth.users.id). Para 3 usuários
-- onde id <> auth_id, todas essas policies falham, bloqueando
-- não só o login (hasActiveFazenda) mas também o acesso a dados
-- de fazendas, categorias, itens_supermercado, precos_categorias,
-- execucoes_rotina, execucoes_rotina_historico, chat_ia_logs e
-- saved_filters.
--
-- Correção:
-- 1. Fixar user_has_fazenda_access() para usar (uf.usuario_id = auth.uid() OR u.auth_id = auth.uid())
-- 2. Criar user_has_fazenda_access_with_papel() para policies que filtram por papel
-- 3. Substituir subqueries problemáticas por chamadas a essas funções (SECURITY DEFINER, bypassa RLS)
-- 4. Fixar policies de saved_filters e usuario_fazenda com subquery a usuarios
-- =====================================================

-- =====================================================
-- 1. Funções helper
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_fazenda_access(p_fazenda_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario_fazenda uf
    JOIN public.usuarios u ON u.id = uf.usuario_id
    WHERE (uf.usuario_id = auth.uid() OR u.auth_id = auth.uid())
      AND uf.fazenda_id = p_fazenda_id
      AND uf.ativo = true
      AND u.ativo = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_fazenda_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_has_fazenda_access_with_papel(p_fazenda_id uuid, p_papel text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario_fazenda uf
    JOIN public.usuarios u ON u.id = uf.usuario_id
    WHERE (uf.usuario_id = auth.uid() OR u.auth_id = auth.uid())
      AND uf.fazenda_id = p_fazenda_id
      AND uf.ativo = true
      AND u.ativo = true
      AND uf.papel = p_papel
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_fazenda_access_with_papel(uuid, text) TO authenticated;

-- =====================================================
-- 2. Policies de usuario_fazenda
-- =====================================================

DROP POLICY IF EXISTS "Users can view their farm associations" ON public.usuario_fazenda;
CREATE POLICY "Users can view their farm associations" ON public.usuario_fazenda
  FOR SELECT TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE id = auth.uid() OR auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their farm associations" ON public.usuario_fazenda;
CREATE POLICY "Users can insert their farm associations" ON public.usuario_fazenda
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE id = auth.uid() OR auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their farm associations" ON public.usuario_fazenda;
CREATE POLICY "Users can delete their farm associations" ON public.usuario_fazenda
  FOR DELETE TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE id = auth.uid() OR auth_id = auth.uid()));

-- =====================================================
-- 3. Policies de fazendas
-- =====================================================

DROP POLICY IF EXISTS "Users can view their farms" ON public.fazendas;
CREATE POLICY "Users can view their farms" ON public.fazendas
  FOR SELECT TO authenticated
  USING (user_has_fazenda_access(id));

DROP POLICY IF EXISTS "Users can update their farms" ON public.fazendas;
CREATE POLICY "Users can update their farms" ON public.fazendas
  FOR UPDATE TO authenticated
  USING (user_has_fazenda_access(id));

-- =====================================================
-- 4. Policies de categorias
-- =====================================================

DROP POLICY IF EXISTS "Users can view farm categories" ON public.categorias;
CREATE POLICY "Users can view farm categories" ON public.categorias
  FOR SELECT TO authenticated
  USING (user_has_fazenda_access(fazenda_id));

DROP POLICY IF EXISTS "Users can manage farm categories" ON public.categorias;
CREATE POLICY "Users can manage farm categories" ON public.categorias
  FOR ALL TO authenticated
  USING (user_has_fazenda_access(fazenda_id))
  WITH CHECK (user_has_fazenda_access(fazenda_id));

-- =====================================================
-- 5. Policies de itens_supermercado
-- =====================================================

DROP POLICY IF EXISTS "Users can view itens_supermercado from their farm" ON public.itens_supermercado;
CREATE POLICY "Users can view itens_supermercado from their farm" ON public.itens_supermercado
  FOR SELECT TO authenticated
  USING (user_has_fazenda_access(fazenda_id));

DROP POLICY IF EXISTS "Users can update itens_supermercado from their farm" ON public.itens_supermercado;
CREATE POLICY "Users can update itens_supermercado from their farm" ON public.itens_supermercado
  FOR UPDATE TO authenticated
  USING (user_has_fazenda_access(fazenda_id));

DROP POLICY IF EXISTS "Users can soft delete itens_supermercado from their farm" ON public.itens_supermercado;
CREATE POLICY "Users can soft delete itens_supermercado from their farm" ON public.itens_supermercado
  FOR UPDATE TO authenticated
  USING (user_has_fazenda_access(fazenda_id));

-- =====================================================
-- 6. Policies de precos_categorias
-- =====================================================

DROP POLICY IF EXISTS "Usuarios podem ler precos de sua fazenda" ON public.precos_categorias;
CREATE POLICY "Usuarios podem ler precos de sua fazenda" ON public.precos_categorias
  FOR SELECT TO authenticated
  USING (user_has_fazenda_access(fazenda_id));

DROP POLICY IF EXISTS "Usuarios podem escrever precos de sua fazenda" ON public.precos_categorias;
CREATE POLICY "Usuarios podem escrever precos de sua fazenda" ON public.precos_categorias
  FOR ALL TO authenticated
  USING (user_has_fazenda_access(fazenda_id))
  WITH CHECK (user_has_fazenda_access(fazenda_id));

-- =====================================================
-- 7. Policies de execucoes_rotina
-- =====================================================

DROP POLICY IF EXISTS "Controllers veem execucoes da fazenda" ON public.execucoes_rotina;
CREATE POLICY "Controllers veem execucoes da fazenda" ON public.execucoes_rotina
  FOR SELECT TO authenticated
  USING (user_has_fazenda_access(fazenda_id));

DROP POLICY IF EXISTS "Controllers atualizam execucoes da fazenda" ON public.execucoes_rotina;
CREATE POLICY "Controllers atualizam execucoes da fazenda" ON public.execucoes_rotina
  FOR UPDATE TO authenticated
  USING (user_has_fazenda_access_with_papel(fazenda_id, 'controller'));

-- =====================================================
-- 8. Policy de execucoes_rotina_historico
-- =====================================================

DROP POLICY IF EXISTS "Usuarios da fazenda veem historico" ON public.execucoes_rotina_historico;
CREATE POLICY "Usuarios da fazenda veem historico" ON public.execucoes_rotina_historico
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.execucoes_rotina er
    WHERE er.id = execucoes_rotina_historico.execucao_rotina_id
      AND user_has_fazenda_access(er.fazenda_id)
  ));

-- =====================================================
-- 9. Policy de chat_ia_logs
-- =====================================================

DROP POLICY IF EXISTS "chat_ia_logs_select_own_fazenda" ON public.chat_ia_logs;
CREATE POLICY "chat_ia_logs_select_own_fazenda" ON public.chat_ia_logs
  FOR SELECT TO authenticated
  USING (user_has_fazenda_access(fazenda_id));

-- =====================================================
-- 10. Policies de saved_filters
-- =====================================================

DROP POLICY IF EXISTS "Users can view own saved_filters" ON public.saved_filters;
CREATE POLICY "Users can view own saved_filters" ON public.saved_filters
  FOR SELECT TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE id = auth.uid() OR auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own saved_filters" ON public.saved_filters;
CREATE POLICY "Users can manage own saved_filters" ON public.saved_filters
  FOR ALL TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE id = auth.uid() OR auth_id = auth.uid()))
  WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE id = auth.uid() OR auth_id = auth.uid()));
