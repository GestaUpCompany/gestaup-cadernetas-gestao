ALTER TABLE modulos_pastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver módulos de suas fazendas"
ON modulos_pastos FOR SELECT
USING (
  fazenda_id IN (
    SELECT fazenda_id FROM usuario_fazenda
    WHERE usuario_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Usuários podem inserir módulos em suas fazendas"
ON modulos_pastos FOR INSERT
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id FROM usuario_fazenda
    WHERE usuario_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Usuários podem atualizar módulos de suas fazendas"
ON modulos_pastos FOR UPDATE
USING (
  fazenda_id IN (
    SELECT fazenda_id FROM usuario_fazenda
    WHERE usuario_id = auth.uid() AND ativo = true
  )
)
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id FROM usuario_fazenda
    WHERE usuario_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Usuários podem excluir módulos de suas fazendas"
ON modulos_pastos FOR DELETE
USING (
  fazenda_id IN (
    SELECT fazenda_id FROM usuario_fazenda
    WHERE usuario_id = auth.uid() AND ativo = true
  )
);;
