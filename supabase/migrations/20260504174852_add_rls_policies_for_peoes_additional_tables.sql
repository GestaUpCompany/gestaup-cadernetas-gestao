-- Fornecedores
DROP POLICY IF EXISTS "Peões podem ler fornecedores da sua fazenda" ON fornecedores;
CREATE POLICY "Peões podem ler fornecedores da sua fazenda" ON fornecedores
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);

-- Funcionarios
DROP POLICY IF EXISTS "Peões podem ler funcionarios da sua fazenda" ON funcionarios;
CREATE POLICY "Peões podem ler funcionarios da sua fazenda" ON funcionarios
FOR SELECT TO authenticated
USING (
  fazenda_id::text IN (
    SELECT fazenda_id 
    FROM peoes 
    WHERE id = auth.uid()::uuid
  )
);;
