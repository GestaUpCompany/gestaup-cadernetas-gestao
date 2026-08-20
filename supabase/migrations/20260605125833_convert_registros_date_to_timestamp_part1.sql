-- Convert date columns to timestamp with time zone (part 1)
ALTER TABLE registros_abastecimento ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_bebedouros ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_clima ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_enfermaria ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_entrada_insumos ALTER COLUMN data_entrada TYPE timestamp with time zone;;
