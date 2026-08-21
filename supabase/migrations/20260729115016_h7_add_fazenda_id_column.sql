-- H7 Passo 1: Adicionar coluna fazenda_id (nullable) a lote_historico
ALTER TABLE public.lote_historico 
ADD COLUMN IF NOT EXISTS fazenda_id uuid;

-- Adicionar indice para futuras queries por fazenda
CREATE INDEX IF NOT EXISTS idx_lote_historico_fazenda_id 
ON public.lote_historico (fazenda_id);

-- Adicionar FK para fazendas
ALTER TABLE public.lote_historico
ADD CONSTRAINT fk_lote_historico_fazenda 
FOREIGN KEY (fazenda_id) REFERENCES public.fazendas(id) ON DELETE CASCADE;

SELECT 'Migration H7 passo 1 aplicada: coluna fazenda_id adicionada' AS status;;
