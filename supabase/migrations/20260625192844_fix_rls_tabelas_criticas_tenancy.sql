
-- ============================================================
-- NOTIFICACOES: usuário vê apenas as suas próprias
-- ============================================================
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas próprias notificações"
  ON public.notificacoes FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários atualizam suas próprias notificações"
  ON public.notificacoes FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid());

-- INSERT/DELETE são feitos por SECURITY DEFINER functions, não pelo usuário diretamente
CREATE POLICY "Usuários não inserem notificações diretamente"
  ON public.notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());


-- ============================================================
-- LOTE_CATEGORIAS: via fazenda_id do lote
-- ============================================================
ALTER TABLE public.lote_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem categorias de lotes de suas fazendas"
  ON public.lote_categorias FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lotes l
      JOIN public.usuario_fazenda uf ON uf.fazenda_id = l.fazenda_id
      WHERE l.id = lote_categorias.lote_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY "Usuários gerenciam categorias de lotes de suas fazendas"
  ON public.lote_categorias FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lotes l
      JOIN public.usuario_fazenda uf ON uf.fazenda_id = l.fazenda_id
      WHERE l.id = lote_categorias.lote_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );


-- ============================================================
-- REGISTROS_PASTAGENS: via fazenda_id
-- ============================================================
ALTER TABLE public.registros_pastagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem registros de pastagens de suas fazendas"
  ON public.registros_pastagens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = registros_pastagens.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY "Usuários gerenciam registros de pastagens de suas fazendas"
  ON public.registros_pastagens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = registros_pastagens.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );


-- ============================================================
-- ROTACAO_PASTOS: via modulos_pastos.fazenda_id
-- ============================================================
ALTER TABLE public.rotacao_pastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem rotações de suas fazendas"
  ON public.rotacao_pastos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.modulos_pastos m
      JOIN public.usuario_fazenda uf ON uf.fazenda_id = m.fazenda_id
      WHERE m.id = rotacao_pastos.modulo_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

CREATE POLICY "Usuários gerenciam rotações de suas fazendas"
  ON public.rotacao_pastos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.modulos_pastos m
      JOIN public.usuario_fazenda uf ON uf.fazenda_id = m.fazenda_id
      WHERE m.id = rotacao_pastos.modulo_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );


-- ============================================================
-- FAZENDAS: usuário vê apenas as fazendas às quais está vinculado
-- ============================================================
ALTER TABLE public.fazendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas fazendas"
  ON public.fazendas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = fazendas.id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );
;
