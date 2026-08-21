-- Renomear id_cria para id_provisorio_cria
ALTER TABLE registros_maternidade RENAME COLUMN id_cria TO id_provisorio_cria;

-- Adicionar id_brinco_cria
ALTER TABLE registros_maternidade ADD COLUMN IF NOT EXISTS id_brinco_cria text;

-- Adicionar id_chip_cria
ALTER TABLE registros_maternidade ADD COLUMN IF NOT EXISTS id_chip_cria text;

-- Renomear chip_mae para id_chip_mae
ALTER TABLE registros_maternidade RENAME COLUMN chip_mae TO id_chip_mae;

-- Adicionar id_brinco_mae
ALTER TABLE registros_maternidade ADD COLUMN IF NOT EXISTS id_brinco_mae text;;
