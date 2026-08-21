-- Populate lote_origem_id from lote_origem text values
UPDATE public.registros_movimentacao rm
SET lote_origem_id = l.id
FROM public.lotes l
WHERE rm.lote_origem = l.nome
  AND rm.lote_origem_id IS NULL
  AND rm.lote_origem IS NOT NULL;

-- Populate lote_destino_id from destino text values (only when destino matches a lote name)
UPDATE public.registros_movimentacao rm
SET lote_destino_id = l.id
FROM public.lotes l
WHERE rm.destino = l.nome
  AND rm.lote_destino_id IS NULL
  AND rm.destino IS NOT NULL;;
