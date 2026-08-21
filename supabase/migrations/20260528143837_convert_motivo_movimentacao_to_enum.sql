-- Convert motivo_movimentacao column to ENUM
ALTER TABLE public.registros_movimentacao 
ALTER COLUMN motivo_movimentacao TYPE tipo_movimentacao_motivo 
USING motivo_movimentacao::tipo_movimentacao_motivo;;
