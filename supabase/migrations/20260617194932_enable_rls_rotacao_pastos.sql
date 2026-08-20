ALTER TABLE rotacao_pastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver rotações de módulos de suas fazendas"
ON rotacao_pastos FOR SELECT
USING (
  modulo_id IN (
    SELECT id FROM modulos_pastos
    WHERE fazenda_id IN (
      SELECT fazenda_id FROM usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  )
);

CREATE POLICY "Usuários podem inserir rotações em módulos de suas fazendas"
ON rotacao_pastos FOR INSERT
WITH CHECK (
  modulo_id IN (
    SELECT id FROM modulos_pastos
    WHERE fazenda_id IN (
      SELECT fazenda_id FROM usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  )
);

CREATE POLICY "Usuários podem atualizar rotações em módulos de suas fazendas"
ON rotacao_pastos FOR UPDATE
USING (
  modulo_id IN (
    SELECT id FROM modulos_pastos
    WHERE fazenda_id IN (
      SELECT fazenda_id FROM usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  )
)
WITH CHECK (
  modulo_id IN (
    SELECT id FROM modulos_pastos
    WHERE fazenda_id IN (
      SELECT fazenda_id FROM usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  )
);

CREATE POLICY "Usuários podem excluir rotações em módulos de suas fazendas"
ON rotacao_pastos FOR DELETE
USING (
  modulo_id IN (
    SELECT id FROM modulos_pastos
    WHERE fazenda_id IN (
      SELECT fazenda_id FROM usuario_fazenda
      WHERE usuario_id = auth.uid() AND ativo = true
    )
  )
);;
