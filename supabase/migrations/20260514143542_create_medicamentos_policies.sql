-- Política para leitura: usuários com vínculo na fazenda podem ver medicamentos
CREATE POLICY "Usuários podem ver medicamentos da fazenda" 
ON medicamentos FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM usuario_fazenda 
    WHERE usuario_fazenda.fazenda_id = medicamentos.fazenda_id 
    AND usuario_fazenda.usuario_id = auth.uid() 
    AND usuario_fazenda.ativo = true
  )
);

-- Política para inserção: usuários com vínculo na fazenda podem criar medicamentos
CREATE POLICY "Usuários podem criar medicamentos na fazenda" 
ON medicamentos FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuario_fazenda 
    WHERE usuario_fazenda.fazenda_id = medicamentos.fazenda_id 
    AND usuario_fazenda.usuario_id = auth.uid() 
    AND usuario_fazenda.ativo = true
  )
);

-- Política para atualização: usuários com vínculo na fazenda podem atualizar medicamentos
CREATE POLICY "Usuários podem atualizar medicamentos da fazenda" 
ON medicamentos FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM usuario_fazenda 
    WHERE usuario_fazenda.fazenda_id = medicamentos.fazenda_id 
    AND usuario_fazenda.usuario_id = auth.uid() 
    AND usuario_fazenda.ativo = true
  )
);

-- Política para deleção: usuários com vínculo na fazenda podem deletar medicamentos
CREATE POLICY "Usuários podem deletar medicamentos da fazenda" 
ON medicamentos FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM usuario_fazenda 
    WHERE usuario_fazenda.fazenda_id = medicamentos.fazenda_id 
    AND usuario_fazenda.usuario_id = auth.uid() 
    AND usuario_fazenda.ativo = true
  )
);;
