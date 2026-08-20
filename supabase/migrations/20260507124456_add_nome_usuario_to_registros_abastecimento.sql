-- Adicionar coluna nome_usuario à tabela registros_abastecimento
ALTER TABLE registros_abastecimento ADD COLUMN IF NOT EXISTS nome_usuario TEXT;;
