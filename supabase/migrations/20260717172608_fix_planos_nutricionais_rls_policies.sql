-- Drop old broken policies on planos_nutricionais
DROP POLICY IF EXISTS planos_nutricionais_select_fazenda ON public.planos_nutricionais;
DROP POLICY IF EXISTS planos_nutricionais_insert_fazenda ON public.planos_nutricionais;
DROP POLICY IF EXISTS planos_nutricionais_update_fazenda ON public.planos_nutricionais;
DROP POLICY IF EXISTS planos_nutricionais_delete_fazenda ON public.planos_nutricionais;

-- Recreate with correct join: usuario_fazenda.usuario_id -> usuarios.id -> usuarios.auth_id = auth.uid()
CREATE POLICY planos_nutricionais_select_fazenda ON public.planos_nutricionais
  FOR SELECT TO authenticated, anon
  USING (fazenda_id IN (
    SELECT uf.fazenda_id FROM usuario_fazenda uf
    JOIN usuarios u ON uf.usuario_id = u.id
    WHERE u.auth_id = auth.uid() AND uf.ativo = true
  ));

CREATE POLICY planos_nutricionais_insert_fazenda ON public.planos_nutricionais
  FOR INSERT TO authenticated, anon
  WITH CHECK (fazenda_id IN (
    SELECT uf.fazenda_id FROM usuario_fazenda uf
    JOIN usuarios u ON uf.usuario_id = u.id
    WHERE u.auth_id = auth.uid() AND uf.ativo = true
  ));

CREATE POLICY planos_nutricionais_update_fazenda ON public.planos_nutricionais
  FOR UPDATE TO authenticated, anon
  USING (fazenda_id IN (
    SELECT uf.fazenda_id FROM usuario_fazenda uf
    JOIN usuarios u ON uf.usuario_id = u.id
    WHERE u.auth_id = auth.uid() AND uf.ativo = true
  ))
  WITH CHECK (fazenda_id IN (
    SELECT uf.fazenda_id FROM usuario_fazenda uf
    JOIN usuarios u ON uf.usuario_id = u.id
    WHERE u.auth_id = auth.uid() AND uf.ativo = true
  ));

CREATE POLICY planos_nutricionais_delete_fazenda ON public.planos_nutricionais
  FOR DELETE TO authenticated, anon
  USING (fazenda_id IN (
    SELECT uf.fazenda_id FROM usuario_fazenda uf
    JOIN usuarios u ON uf.usuario_id = u.id
    WHERE u.auth_id = auth.uid() AND uf.ativo = true
  ));

-- Fix snapshots policies too
DROP POLICY IF EXISTS planos_nutricionais_snapshots_select_fazenda ON public.planos_nutricionais_snapshots;
DROP POLICY IF EXISTS planos_nutricionais_snapshots_insert_fazenda ON public.planos_nutricionais_snapshots;

CREATE POLICY planos_nutricionais_snapshots_select_fazenda ON public.planos_nutricionais_snapshots
  FOR SELECT TO authenticated, anon
  USING (fazenda_id IN (
    SELECT uf.fazenda_id FROM usuario_fazenda uf
    JOIN usuarios u ON uf.usuario_id = u.id
    WHERE u.auth_id = auth.uid() AND uf.ativo = true
  ));

CREATE POLICY planos_nutricionais_snapshots_insert_fazenda ON public.planos_nutricionais_snapshots
  FOR INSERT TO authenticated, anon
  WITH CHECK (fazenda_id IN (
    SELECT uf.fazenda_id FROM usuario_fazenda uf
    JOIN usuarios u ON uf.usuario_id = u.id
    WHERE u.auth_id = auth.uid() AND uf.ativo = true
  ));;
