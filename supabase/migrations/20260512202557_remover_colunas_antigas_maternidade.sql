-- Remover colunas antigas de identificação
ALTER TABLE registros_maternidade DROP COLUMN IF EXISTS brinco_mae;
ALTER TABLE registros_maternidade DROP COLUMN IF EXISTS brinco_cria;
ALTER TABLE registros_maternidade DROP COLUMN IF EXISTS chip_cria;;
