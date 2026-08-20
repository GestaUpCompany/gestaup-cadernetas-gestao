-- Remover RLS da tabela
ALTER TABLE registros_manutencao_maquinas DISABLE ROW LEVEL SECURITY;

-- Dar permissões de CRUD (menos delete) para anon
GRANT SELECT ON TABLE registros_manutencao_maquinas TO anon;
GRANT INSERT ON TABLE registros_manutencao_maquinas TO anon;
GRANT UPDATE ON TABLE registros_manutencao_maquinas TO anon;;
