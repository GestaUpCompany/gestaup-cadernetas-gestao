-- Adicionar coluna setor_entrega à tabela de almoxarifado
ALTER TABLE registros_almoxarifado ADD COLUMN IF NOT EXISTS setor_entrega TEXT;;
