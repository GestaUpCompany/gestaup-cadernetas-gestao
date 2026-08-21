-- Convert date columns to timestamp with time zone (part 3)
ALTER TABLE registros_pastagens ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_problemas ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_rodeio ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_saida_insumos ALTER COLUMN data_producao TYPE timestamp with time zone;
ALTER TABLE registros_suplementacao ALTER COLUMN data TYPE timestamp with time zone;;
