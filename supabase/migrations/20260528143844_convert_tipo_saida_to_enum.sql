-- Convert tipo_saida column to ENUM
ALTER TABLE public.registros_movimentacao 
ALTER COLUMN tipo_saida TYPE tipo_movimentacao_saida 
USING tipo_saida::tipo_movimentacao_saida;;
