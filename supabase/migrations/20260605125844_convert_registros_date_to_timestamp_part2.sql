-- Convert date columns to timestamp with time zone (part 2)
ALTER TABLE registros_limpeza ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_maternidade ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_morte ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_movimentacao ALTER COLUMN data TYPE timestamp with time zone;
ALTER TABLE registros_operacoes_maquinas ALTER COLUMN data TYPE timestamp with time zone;;
