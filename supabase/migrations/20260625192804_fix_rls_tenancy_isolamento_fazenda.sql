
-- ============================================================
-- LOTES: restringir SELECT à fazenda do usuário
-- ============================================================
DROP POLICY IF EXISTS "Authenticated select lotes" ON public.lotes;
CREATE POLICY "Usuários veem lotes de suas fazendas"
  ON public.lotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = lotes.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "Authenticated update lotes" ON public.lotes;
CREATE POLICY "Usuários atualizam lotes de suas fazendas"
  ON public.lotes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = lotes.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "Authenticated delete lotes" ON public.lotes;
CREATE POLICY "Usuários excluem lotes de suas fazendas"
  ON public.lotes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = lotes.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "Authenticated insert lotes" ON public.lotes;
CREATE POLICY "Usuários inserem lotes em suas fazendas"
  ON public.lotes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = lotes.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );


-- ============================================================
-- PASTOS: restringir SELECT à fazenda do usuário
-- ============================================================
DROP POLICY IF EXISTS "Authenticated select pastos" ON public.pastos;
CREATE POLICY "Usuários veem pastos de suas fazendas"
  ON public.pastos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = pastos.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "Authenticated update pastos" ON public.pastos;
CREATE POLICY "Usuários atualizam pastos de suas fazendas"
  ON public.pastos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = pastos.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "Authenticated delete pastos" ON public.pastos;
CREATE POLICY "Usuários excluem pastos de suas fazendas"
  ON public.pastos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = pastos.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );

DROP POLICY IF EXISTS "Authenticated insert pastos" ON public.pastos;
CREATE POLICY "Usuários inserem pastos em suas fazendas"
  ON public.pastos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_fazenda uf
      WHERE uf.fazenda_id = pastos.fazenda_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );


-- ============================================================
-- LOTE_PASTO_HISTORICO: restringir via fazenda_id do lote
-- ============================================================
DROP POLICY IF EXISTS "lote_pasto_historico_select_policy" ON public.lote_pasto_historico;
CREATE POLICY "Usuários veem historico pasto de suas fazendas"
  ON public.lote_pasto_historico FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lotes l
      JOIN public.usuario_fazenda uf ON uf.fazenda_id = l.fazenda_id
      WHERE l.id = lote_pasto_historico.lote_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );


-- ============================================================
-- LOTE_MODULO_HISTORICO: restringir via fazenda_id do lote
-- ============================================================
DROP POLICY IF EXISTS "lote_modulo_historico_select_policy" ON public.lote_modulo_historico;
CREATE POLICY "Usuários veem historico modulo de suas fazendas"
  ON public.lote_modulo_historico FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lotes l
      JOIN public.usuario_fazenda uf ON uf.fazenda_id = l.fazenda_id
      WHERE l.id = lote_modulo_historico.lote_id
        AND uf.usuario_id = auth.uid()
        AND uf.ativo = true
    )
  );
;
