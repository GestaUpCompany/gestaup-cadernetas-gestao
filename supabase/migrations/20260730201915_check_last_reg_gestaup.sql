-- Testar trigger: inserir registro apos o recalculo
-- Primeiro verificar o ultimo registro da Gesta'Up
SELECT id, data, lote_id, formulacao, kg_cocho, n_cabecas, peso_vivo_kg,
  consumo_medio_geral_kg_mn
FROM registros_suplementacao
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND deleted_at IS NULL
  AND lote_id IS NOT NULL
ORDER BY data DESC
LIMIT 3;;
