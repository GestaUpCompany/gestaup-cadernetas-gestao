-- Corrigir RLS: auth.uid() retorna auth_id, nao usuarios.id.
-- Fazer join com usuarios para comparar com auth_id.

DROP POLICY IF EXISTS "Usuarios podem ver config de leitura de cocho" ON public.notas_leitura_cocho_config;
DROP POLICY IF EXISTS "Usuarios podem editar config de leitura de cocho" ON public.notas_leitura_cocho_config;
DROP POLICY IF EXISTS "Usuarios podem inserir config de leitura de cocho" ON public.notas_leitura_cocho_config;

CREATE POLICY "Usuarios podem ver config de leitura de cocho" ON public.notas_leitura_cocho_config
  FOR SELECT USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

CREATE POLICY "Usuarios podem editar config de leitura de cocho" ON public.notas_leitura_cocho_config
  FOR UPDATE USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

CREATE POLICY "Usuarios podem inserir config de leitura de cocho" ON public.notas_leitura_cocho_config
  FOR INSERT WITH CHECK (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- Aplicar a mesma correcao em notificacoes_config (mesmo bug)
DROP POLICY IF EXISTS "Usuarios podem ver config de suas fazendas" ON public.notificacoes_config;
DROP POLICY IF EXISTS "Usuarios podem editar config de suas fazendas" ON public.notificacoes_config;

CREATE POLICY "Usuarios podem ver config de suas fazendas" ON public.notificacoes_config
  FOR SELECT USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

CREATE POLICY "Usuarios podem editar config de suas fazendas" ON public.notificacoes_config
  FOR UPDATE USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

SELECT 'RLS corrigida para auth_id join' AS status;;
