-- Convert text date columns to timestamp with time zone
ALTER TABLE registros_cantina ALTER COLUMN data TYPE timestamp with time zone USING data::timestamp with time zone;
ALTER TABLE registros_manutencao_maquinas ALTER COLUMN data TYPE timestamp with time zone USING data::timestamp with time zone;;
