-- Remover categorias indesejadas da tabela lote_categorias

-- L1 (d3596b7b...): manter apenas 'vaca' e 'bezerro ao pé'
DELETE FROM public.lote_categorias
WHERE lote_id = 'd3596b7b-733f-4007-a1ba-af24e25dfe66'
  AND categoria NOT IN ('vaca', 'bezerro ao pé');

-- L2 (aab9eab6...): manter apenas 'boi magro'
DELETE FROM public.lote_categorias
WHERE lote_id = 'aab9eab6-a56f-4e7c-85be-4829999fb347'
  AND categoria <> 'boi magro';

-- L3 (5025c36d...): manter apenas 'Touro'
DELETE FROM public.lote_categorias
WHERE lote_id = '5025c36d-066a-4d8c-9fb3-aa0f96e6da20'
  AND categoria <> 'Touro';

-- Atualizar a coluna categorias nos registros de suplementacao para refletir a nova realidade
UPDATE public.registros_suplementacao
SET categorias = 'vaca, bezerro ao pé',
    updated_at = NOW()
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND lote_id = 'd3596b7b-733f-4007-a1ba-af24e25dfe66'
  AND deleted_at IS NULL;

UPDATE public.registros_suplementacao
SET categorias = 'boi magro',
    updated_at = NOW()
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND lote_id = 'aab9eab6-a56f-4e7c-85be-4829999fb347'
  AND deleted_at IS NULL;

UPDATE public.registros_suplementacao
SET categorias = 'Touro',
    updated_at = NOW()
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND lote_id = '5025c36d-066a-4d8c-9fb3-aa0f96e6da20'
  AND deleted_at IS NULL;;
