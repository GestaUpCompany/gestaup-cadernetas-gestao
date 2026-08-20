-- H2 Etapa 1: Adicionar individuo_id a registros_movimentacao
-- Necessario para receber migracao de lote_historico que tem esse campo
ALTER TABLE public.registros_movimentacao 
ADD COLUMN IF NOT EXISTS individuo_id uuid;

-- FK para individuos (se a tabela existir)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'individuos' AND table_schema = 'public') THEN
    ALTER TABLE public.registros_movimentacao
    ADD CONSTRAINT fk_registros_movimentacao_individuo
    FOREIGN KEY (individuo_id) REFERENCES public.individuos(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_registros_movimentacao_individuo_id
ON public.registros_movimentacao (individuo_id)
WHERE individuo_id IS NOT NULL;

SELECT 'Coluna individuo_id adicionada a registros_movimentacao' AS status;;
