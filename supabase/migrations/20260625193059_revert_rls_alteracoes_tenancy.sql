
-- ============================================================
-- LOTES: restaurar políticas originais (qual = true)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem lotes de suas fazendas" ON public.lotes;
DROP POLICY IF EXISTS "Usuários atualizam lotes de suas fazendas" ON public.lotes;
DROP POLICY IF EXISTS "Usuários excluem lotes de suas fazendas" ON public.lotes;
DROP POLICY IF EXISTS "Usuários inserem lotes em suas fazendas" ON public.lotes;

CREATE POLICY "Authenticated select lotes" ON public.lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update lotes" ON public.lotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete lotes" ON public.lotes FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated insert lotes" ON public.lotes FOR INSERT TO authenticated WITH CHECK (true);


-- ============================================================
-- PASTOS: restaurar políticas originais (qual = true)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem pastos de suas fazendas" ON public.pastos;
DROP POLICY IF EXISTS "Usuários atualizam pastos de suas fazendas" ON public.pastos;
DROP POLICY IF EXISTS "Usuários excluem pastos de suas fazendas" ON public.pastos;
DROP POLICY IF EXISTS "Usuários inserem pastos em suas fazendas" ON public.pastos;

CREATE POLICY "Authenticated select pastos" ON public.pastos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update pastos" ON public.pastos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete pastos" ON public.pastos FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated insert pastos" ON public.pastos FOR INSERT TO authenticated WITH CHECK (true);


-- ============================================================
-- LOTE_PASTO_HISTORICO: restaurar política original (qual = true)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem historico pasto de suas fazendas" ON public.lote_pasto_historico;
CREATE POLICY "lote_pasto_historico_select_policy" ON public.lote_pasto_historico FOR SELECT TO authenticated USING (true);


-- ============================================================
-- LOTE_MODULO_HISTORICO: restaurar política original (qual = true)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem historico modulo de suas fazendas" ON public.lote_modulo_historico;
CREATE POLICY "lote_modulo_historico_select_policy" ON public.lote_modulo_historico FOR SELECT TO authenticated USING (true);


-- ============================================================
-- NOTIFICACOES: desabilitar RLS (estava sem antes)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem suas próprias notificações" ON public.notificacoes;
DROP POLICY IF EXISTS "Usuários atualizam suas próprias notificações" ON public.notificacoes;
DROP POLICY IF EXISTS "Usuários não inserem notificações diretamente" ON public.notificacoes;
ALTER TABLE public.notificacoes DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- LOTE_CATEGORIAS: desabilitar RLS (estava sem antes)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem categorias de lotes de suas fazendas" ON public.lote_categorias;
DROP POLICY IF EXISTS "Usuários gerenciam categorias de lotes de suas fazendas" ON public.lote_categorias;
ALTER TABLE public.lote_categorias DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- REGISTROS_PASTAGENS: desabilitar RLS (estava sem antes)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem registros de pastagens de suas fazendas" ON public.registros_pastagens;
DROP POLICY IF EXISTS "Usuários gerenciam registros de pastagens de suas fazendas" ON public.registros_pastagens;
ALTER TABLE public.registros_pastagens DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- ROTACAO_PASTOS: desabilitar RLS (estava sem antes)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem rotações de suas fazendas" ON public.rotacao_pastos;
DROP POLICY IF EXISTS "Usuários gerenciam rotações de suas fazendas" ON public.rotacao_pastos;
ALTER TABLE public.rotacao_pastos DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- FAZENDAS: desabilitar RLS (estava sem antes)
-- ============================================================
DROP POLICY IF EXISTS "Usuários veem suas fazendas" ON public.fazendas;
ALTER TABLE public.fazendas DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- MODULOS_PASTOS: desabilitar RLS (estava desabilitado antes)
-- ============================================================
ALTER TABLE public.modulos_pastos DISABLE ROW LEVEL SECURITY;
;
