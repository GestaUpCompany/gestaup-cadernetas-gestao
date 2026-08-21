
-- Adiciona coluna 'categoria' na tabela formulacoes
ALTER TABLE public.formulacoes
ADD COLUMN IF NOT EXISTS categoria text;

COMMENT ON COLUMN public.formulacoes.categoria IS 'Categoria do gado (vaca, touro, boi gordo, boi magro, garrote, bezerro, bezerro ao pé, bezerra, bezerra ao pé, novilha, tropa)';
;
