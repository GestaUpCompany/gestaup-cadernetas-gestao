ALTER TABLE registros_suplementacao DROP CONSTRAINT IF EXISTS registros_suplementacao_leitura_check;
ALTER TABLE registros_suplementacao ALTER COLUMN leitura TYPE TEXT;;
