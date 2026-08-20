
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS tipo_saida;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS tipo_entrada;
ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS tipo_destino;
DROP TYPE IF EXISTS tipo_movimentacao_saida;
DROP TYPE IF EXISTS tipo_movimentacao_entrada;
;
