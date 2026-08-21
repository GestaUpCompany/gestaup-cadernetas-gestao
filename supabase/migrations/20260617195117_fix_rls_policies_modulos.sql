DROP POLICY IF EXISTS "Usuários podem ver módulos de suas fazendas" ON modulos_pastos;
DROP POLICY IF EXISTS "Usuários podem inserir módulos em suas fazendas" ON modulos_pastos;
DROP POLICY IF EXISTS "Usuários podem atualizar módulos de suas fazendas" ON modulos_pastos;
DROP POLICY IF EXISTS "Usuários podem excluir módulos de suas fazendas" ON modulos_pastos;

CREATE POLICY "Usuários podem ver módulos de suas fazendas"
ON modulos_pastos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuario_fazenda
    WHERE usuario_fazenda.fazenda_id = modulos_pastos.fazenda_id
    AND usuario_fazenda.usuario_id = auth.uid()
    AND usuario_fazenda.ativo = true
  )
);

CREATE POLICY "Usuários podem inserir módulos em suas fazendas"
ON modulos_pastos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuario_fazenda
    WHERE usuario_fazenda.fazenda_id = modulos_pastos.fazenda_id
    AND usuario_fazenda.usuario_id = auth.uid()
    AND usuario_fazenda.ativo = true
  )
);

CREATE POLICY "Usuários podem atualizar módulos de suas fazendas"
ON modulos_pastos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuario_fazenda
    WHERE usuario_fazenda.fazenda_id = modulos_pastos.fazenda_id
    AND usuario_fazenda.usuario_id = auth.uid()
    AND usuario_fazenda.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuario_fazenda
    WHERE usuario_fazenda.fazenda_id = modulos_pastos.fazenda_id
    AND usuario_fazenda.usuario_id = auth.uid()
    AND usuario_fazenda.ativo = true
  )
);

CREATE POLICY "Usuários podem excluir módulos de suas fazendas"
ON modulos_pastos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuario_fazenda
    WHERE usuario_fazenda.fazenda_id = modulos_pastos.fazenda_id
    AND usuario_fazenda.usuario_id = auth.uid()
    AND usuario_fazenda.ativo = true
  )
);;
