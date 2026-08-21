-- Populate lote_id from lote text values in registros_maternidade
UPDATE public.registros_maternidade rm
SET lote_id = l.id
FROM public.lotes l
WHERE rm.lote = l.nome
  AND rm.lote_id IS NULL
  AND rm.lote IS NOT NULL;;
