-- Copiar dados da coluna antiga para a nova
UPDATE public.formulacoes
SET consumo_ms_percent_pv = meta_consumo_ms_percent_pv
WHERE consumo_ms_percent_pv IS NULL
  AND meta_consumo_ms_percent_pv IS NOT NULL;

-- Dropar a coluna antiga
ALTER TABLE public.formulacoes DROP COLUMN IF EXISTS meta_consumo_ms_percent_pv;;
