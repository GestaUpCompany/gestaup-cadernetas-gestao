-- Desabilitar RLS para seguir o padrão das outras tabelas do projeto
ALTER TABLE registros_abastecimento DISABLE ROW LEVEL SECURITY;

-- Remover políticas (já não serão usadas)
DROP POLICY IF EXISTS "Permitir leitura registros_abastecimento anon" ON registros_abastecimento;
DROP POLICY IF EXISTS "Permitir inserção registros_abastecimento anon" ON registros_abastecimento;
DROP POLICY IF EXISTS "Permitir atualização registros_abastecimento anon" ON registros_abastecimento;
DROP POLICY IF EXISTS "Permitir deleção lógica registros_abastecimento anon" ON registros_abastecimento;;
