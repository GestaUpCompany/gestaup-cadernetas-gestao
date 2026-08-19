-- Hard delete de todos os lotes da Fazenda Marcon (c4d13f1f-a785-4bcd-8e72-4ac4b28ee034)
--
-- Contexto: usuario admitiu erro de cadastro que criou 69 lotes (61 ativos + 8
-- soft-deletados). Decisao: hard delete de tudo para recadastro limpo.
--
-- Backup pre-delete: schema backup_marcon_20260819 (ver migration 20260819150000)
--   - 69 lotes, 94 lote_categorias, 41 planos_nutricionais, 41 snapshots, 5 registros_suplementacao
--
-- Execucao em 2 fases:
--   Fase 1: 61 lotes ativos (deleted_at IS NULL)
--     - DELETE planos_nutricionais_snapshots (NO ACTION em lote_categoria_id)
--     - DELETE lotes (CASCADE -> lote_categorias, planos_nutricionais, transicoes, historicos)
--   Fase 2: 8 lotes soft-deletados + 5 categorias orfas
--     - DELETE lote_categorias orfas (lote_id aponta para lotes inexistentes)
--     - DELETE lotes soft-deletados (CASCADE -> 8 categorias)
--
-- Verificacoes pos-delete (todas OK):
--   1. 0 lotes da Marcon
--   2. 0 categorias orfas
--   3. 0 planos orfos
--   4. 0 snapshots orfos
--   5. 165 pastos da Marcon intactos
--   6. 44 registros_suplementacao orfaos (lote_id = NULL, SET NULL por FK)
--   7. 0 categorias da Marcon

-- Fase 1: lotes ativos
DELETE FROM planos_nutricionais_snapshots
WHERE lote_categoria_id IN (
  SELECT lc.id FROM lote_categorias lc
  JOIN lotes l ON l.id = lc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL
);

DELETE FROM lotes
WHERE fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND deleted_at IS NULL;

-- Fase 2: lotes soft-deletados + categorias orfas
DELETE FROM lote_categorias
WHERE id IN (
  SELECT lc.id FROM lote_categorias lc
  LEFT JOIN lotes l ON l.id = lc.lote_id WHERE l.id IS NULL
);

DELETE FROM lotes
WHERE fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND deleted_at IS NOT NULL;
