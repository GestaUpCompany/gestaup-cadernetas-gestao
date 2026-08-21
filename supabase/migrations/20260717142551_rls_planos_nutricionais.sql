
-- ============================================================================
-- RLS para planos_nutricionais e planos_nutricionais_snapshots
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.planos_nutricionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_nutricionais_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas para planos_nutricionais
DROP POLICY IF EXISTS "planos_nutricionais_select_fazenda" ON public.planos_nutricionais;
CREATE POLICY "planos_nutricionais_select_fazenda"
  ON public.planos_nutricionais
  FOR SELECT
  USING (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_insert_fazenda" ON public.planos_nutricionais;
CREATE POLICY "planos_nutricionais_insert_fazenda"
  ON public.planos_nutricionais
  FOR INSERT
  WITH CHECK (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_update_fazenda" ON public.planos_nutricionais;
CREATE POLICY "planos_nutricionais_update_fazenda"
  ON public.planos_nutricionais
  FOR UPDATE
  USING (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_delete_fazenda" ON public.planos_nutricionais;
CREATE POLICY "planos_nutricionais_delete_fazenda"
  ON public.planos_nutricionais
  FOR DELETE
  USING (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

-- Políticas para planos_nutricionais_snapshots
DROP POLICY IF EXISTS "planos_nutricionais_snapshots_select_fazenda" ON public.planos_nutricionais_snapshots;
CREATE POLICY "planos_nutricionais_snapshots_select_fazenda"
  ON public.planos_nutricionais_snapshots
  FOR SELECT
  USING (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );

DROP POLICY IF EXISTS "planos_nutricionais_snapshots_insert_fazenda" ON public.planos_nutricionais_snapshots;
CREATE POLICY "planos_nutricionais_snapshots_insert_fazenda"
  ON public.planos_nutricionais_snapshots
  FOR INSERT
  WITH CHECK (
    fazenda_id IN (
      SELECT fazenda_id FROM public.usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  );
;
