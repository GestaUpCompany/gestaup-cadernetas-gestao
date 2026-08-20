-- Adicionar colunas para sub-tipos de movimentação
ALTER TABLE public.registros_movimentacao
ADD COLUMN tipo_saida TEXT,
ADD COLUMN tipo_entrada TEXT;;
