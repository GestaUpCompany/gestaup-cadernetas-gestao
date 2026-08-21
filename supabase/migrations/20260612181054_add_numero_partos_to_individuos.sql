
-- Add numero_partos column to individuos table
ALTER TABLE public.individuos
ADD COLUMN IF NOT EXISTS numero_partos INTEGER DEFAULT 0;

-- Update existing mothers with their actual birth count
UPDATE public.individuos i
SET numero_partos = COALESCE(sub.count, 0)
FROM (
  SELECT individuo_id_mae, COUNT(*) AS count
  FROM public.registros_maternidade
  WHERE deleted_at IS NULL
    AND individuo_id_mae IS NOT NULL
  GROUP BY individuo_id_mae
) sub
WHERE i.id = sub.individuo_id_mae;
;
