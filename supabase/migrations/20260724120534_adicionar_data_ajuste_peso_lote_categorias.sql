
-- Adicionar coluna data_ajuste_peso em lote_categorias
-- Marca a data da última edição manual de peso pelo usuário.
-- Quando presente, o cron passa a projetar incrementalmente (peso_atual + GMD por dia)
-- em vez de usar a fórmula peso_inicio + (hoje - data_inicio) * GMD
ALTER TABLE public.lote_categorias
ADD COLUMN IF NOT EXISTS data_ajuste_peso date;
;
