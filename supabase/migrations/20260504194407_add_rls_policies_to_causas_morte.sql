-- Habilitar RLS na tabela causas_morte
ALTER TABLE causas_morte ENABLE ROW LEVEL SECURITY;

-- Política para admins lerem causas de morte
CREATE POLICY "Admins podem ler causas_morte" ON causas_morte
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid() AND usuarios.papel = 'admin'
  )
);

-- Política para controllers lerem causas de morte
CREATE POLICY "Controllers podem ler causas_morte" ON causas_morte
FOR SELECT
TO authenticated
USING (
  fazenda_id IN (
    SELECT usuario_fazenda.fazenda_id
    FROM usuario_fazenda
    WHERE usuario_fazenda.usuario_id = auth.uid()
  )
);

-- Política para controllers inserirem causas de morte
CREATE POLICY "Controllers podem inserir causas_morte" ON causas_morte
FOR INSERT
TO authenticated
WITH CHECK (
  fazenda_id IN (
    SELECT usuario_fazenda.fazenda_id
    FROM usuario_fazenda
    WHERE usuario_fazenda.usuario_id = auth.uid()
  )
);

-- Política para controllers atualizarem causas de morte
CREATE POLICY "Controllers podem atualizar causas_morte" ON causas_morte
FOR UPDATE
TO authenticated
USING (
  fazenda_id IN (
    SELECT usuario_fazenda.fazenda_id
    FROM usuario_fazenda
    WHERE usuario_fazenda.usuario_id = auth.uid()
  )
);

-- Política para controllers deletarem causas de morte
CREATE POLICY "Controllers podem deletar causas_morte" ON causas_morte
FOR DELETE
TO authenticated
USING (
  fazenda_id IN (
    SELECT usuario_fazenda.fazenda_id
    FROM usuario_fazenda
    WHERE usuario_fazenda.usuario_id = auth.uid()
  )
);

-- Política para peões lerem causas de morte
CREATE POLICY "Peões podem ler causas_morte da sua fazenda" ON causas_morte
FOR SELECT
TO authenticated
USING (
  fazenda_id::text IN (
    SELECT peoes.fazenda_id
    FROM peoes
    WHERE peoes.id = auth.uid()
  )
);;
