-- Adicionar colunas separadas para brinco e chip
ALTER TABLE public.registros_movimentacao
ADD COLUMN brinco TEXT,
ADD COLUMN chip TEXT;;
