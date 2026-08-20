-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver medicamentos da fazenda" ON medicamentos;
DROP POLICY IF EXISTS "Usuários podem criar medicamentos na fazenda" ON medicamentos;
DROP POLICY IF EXISTS "Usuários podem atualizar medicamentos da fazenda" ON medicamentos;
DROP POLICY IF EXISTS "Usuários podem deletar medicamentos da fazenda" ON medicamentos;

-- Criar políticas simplificadas seguindo o padrão do sistema
CREATE POLICY "Enable read access for all authenticated users" 
ON medicamentos FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for all authenticated users" 
ON medicamentos FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" 
ON medicamentos FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" 
ON medicamentos FOR DELETE 
TO authenticated 
USING (true);;
