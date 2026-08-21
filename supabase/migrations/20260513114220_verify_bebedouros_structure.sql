-- Verificar estrutura real da tabela bebedouros
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bebedouros' AND table_schema = 'public' 
ORDER BY ordinal_position;;
