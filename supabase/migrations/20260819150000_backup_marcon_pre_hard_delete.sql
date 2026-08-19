-- Backup pre-hard-delete da Fazenda Marcon (c4d13f1f-a785-4bcd-8e72-4ac4b28ee034)
--
-- Contexto: usuario admitiu erro de cadastro que criou 61 lotes (35 dos quais
-- vazios, sem movimentacoes). Decisao: hard delete de todos os lotes da fazenda
-- para recadastro limpo. Este backup preserva todos os dados relacionados no
-- schema backup_marcon_20260819 para consulta/restauracao se necessario.
--
-- Valores copiados (validados):
--   lotes: 61 | lote_categorias: 81 | planos_nutricionais: 41
--   planos_nutricionais_snapshots: 41 | registros_suplementacao: 5
--   demais 16 tabelas: 0 registros cada (copiadas por seguranca)
--
-- Integridade referencial validada pos-copia:
--   - todas as categorias pertencem a lotes do backup
--   - todos os planos pertencem a categorias do backup
--   - todos os snapshots pertencem a categorias e planos do backup
--   - todos os registros_suplementacao pertencem a lotes do backup
--   - IDs unicos em todas as tabelas
--   - numero de colunas identico ao original em todas as tabelas
--
-- Para remover o backup apos confirmacao: DROP SCHEMA backup_marcon_20260819 CASCADE;

CREATE SCHEMA IF NOT EXISTS backup_marcon_20260819;

CREATE TABLE backup_marcon_20260819.lotes AS
  SELECT * FROM lotes
  WHERE fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.lote_categorias AS
  SELECT lc.* FROM lote_categorias lc
  JOIN lotes l ON l.id = lc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.planos_nutricionais AS
  SELECT pn.* FROM planos_nutricionais pn
  JOIN lote_categorias lc ON lc.id = pn.lote_categoria_id
  JOIN lotes l ON l.id = lc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.planos_nutricionais_snapshots AS
  SELECT pns.* FROM planos_nutricionais_snapshots pns
  JOIN lote_categorias lc ON lc.id = pns.lote_categoria_id
  JOIN lotes l ON l.id = lc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_suplementacao AS
  SELECT rs.* FROM registros_suplementacao rs
  JOIN lotes l ON l.id = rs.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.lote_categorias_transicoes AS
  SELECT lct.* FROM lote_categorias_transicoes lct
  JOIN lotes l ON l.id = lct.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.lote_historico AS
  SELECT lh.* FROM lote_historico lh
  JOIN lotes l ON l.id = lh.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.lote_pasto_historico AS
  SELECT lph.* FROM lote_pasto_historico lph
  JOIN lotes l ON l.id = lph.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.lote_modulo_historico AS
  SELECT lmh.* FROM lote_modulo_historico lmh
  JOIN lotes l ON l.id = lmh.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_movimentacao AS
  SELECT rm.* FROM registros_movimentacao rm
  JOIN lotes l ON l.id = rm.lote_origem_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL
  UNION
  SELECT rm.* FROM registros_movimentacao rm
  JOIN lotes l ON l.id = rm.lote_destino_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_morte AS
  SELECT rm.* FROM registros_morte rm
  JOIN lotes l ON l.id = rm.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_maternidade AS
  SELECT rm.* FROM registros_maternidade rm
  JOIN lotes l ON l.id = rm.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_leitura_cocho AS
  SELECT rlc.* FROM registros_leitura_cocho rlc
  JOIN lotes l ON l.id = rlc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_rodeio AS
  SELECT rr.* FROM registros_rodeio rr
  JOIN lotes l ON l.id = rr.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_enfermaria AS
  SELECT re.* FROM registros_enfermaria re
  JOIN lotes l ON l.id = re.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_pastagens AS
  SELECT rp.* FROM registros_pastagens rp
  JOIN lotes l ON l.id = rp.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_bebedouros AS
  SELECT rb.* FROM registros_bebedouros rb
  JOIN lotes l ON l.id = rb.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.registros_oferta_trato AS
  SELECT rot.* FROM registros_oferta_trato rot
  JOIN lotes l ON l.id = rot.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.currais AS
  SELECT c.* FROM currais c
  JOIN lotes l ON l.id = c.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.individuos AS
  SELECT i.* FROM individuos i
  JOIN lotes l ON l.id = i.lote_atual
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

CREATE TABLE backup_marcon_20260819.programacao_tratos_currais AS
  SELECT ptc.* FROM programacao_tratos_currais ptc
  JOIN lotes l ON l.id = ptc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;
