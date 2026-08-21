-- Criar tabela temporária para armazenar estrutura
DROP TABLE IF EXISTS temp_bebedouros_structure;
CREATE TEMP TABLE temp_bebedouros_structure (
    column_name text,
    data_type text,
    is_nullable text,
    column_default text
);

-- Inserir dados da estrutura
INSERT INTO temp_bebedouros_structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bebedouros' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Selecionar da tabela temporária
SELECT * FROM temp_bebedouros_structure;;
