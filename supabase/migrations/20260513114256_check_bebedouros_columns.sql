-- Verificar colunas da tabela bebedouros
DO $$
DECLARE
    col_name text;
    col_type text;
BEGIN
    FOR col_name, col_type IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bebedouros' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: %, Type: %', col_name, col_type;
    END LOOP;
END $$;;
