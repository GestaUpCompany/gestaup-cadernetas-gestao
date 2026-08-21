-- Atualizar categoria Touro do L3 com quantidade e peso vivo coerentes
UPDATE public.lote_categorias
SET quant_atual = 60,
    peso_vivo_atual_kg_cab = 380,
    quant_inicial = 60,
    peso_entrada_kg_cab = 380,
    updated_at = NOW()
WHERE lote_id = '5025c36d-066a-4d8c-9fb3-aa0f96e6da20'
  AND categoria = 'Touro';

-- Garantir consistencia nos registros de suplementacao do L3
UPDATE public.registros_suplementacao
SET n_cabecas = 60,
    peso_vivo_kg = 380,
    updated_at = NOW()
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND lote_id = '5025c36d-066a-4d8c-9fb3-aa0f96e6da20'
  AND deleted_at IS NULL;;
