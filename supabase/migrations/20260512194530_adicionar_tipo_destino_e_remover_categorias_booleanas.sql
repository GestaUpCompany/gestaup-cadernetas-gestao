-- Adicionar campo tipo_destino
ALTER TABLE registros_movimentacao ADD COLUMN IF NOT EXISTS tipo_destino text;

-- Remover campos booleanos de categorias
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS vaca;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS touro;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS boi_gordo;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS boi_magro;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS garrote;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS bezerro;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS novilha;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS tropa;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS outros;;
