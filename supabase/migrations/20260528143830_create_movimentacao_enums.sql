-- Create ENUM type for motivo_movimentacao
CREATE TYPE tipo_movimentacao_motivo AS ENUM ('Consumo', 'Abate', 'Saída', 'Entrada', 'Entrevero', 'Doação');

-- Create ENUM type for tipo_saida
CREATE TYPE tipo_movimentacao_saida AS ENUM ('Venda', 'Apartação', 'Transferência');

-- Create ENUM type for tipo_entrada
CREATE TYPE tipo_movimentacao_entrada AS ENUM ('Compras', 'Apartação', 'Transferência');;
