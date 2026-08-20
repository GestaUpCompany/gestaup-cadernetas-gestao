-- Convert tipo_entrada column to ENUM
ALTER TABLE public.registros_movimentacao 
ALTER COLUMN tipo_entrada TYPE tipo_movimentacao_entrada 
USING tipo_entrada::tipo_movimentacao_entrada;;
