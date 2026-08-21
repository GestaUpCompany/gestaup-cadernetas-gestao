ALTER TABLE registros_operacoes_maquinas DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE registros_operacoes_maquinas TO anon;
GRANT ALL ON TABLE registros_operacoes_maquinas TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;;
