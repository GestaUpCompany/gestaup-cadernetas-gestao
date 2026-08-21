-- Backup pre-hard-delete da Fazenda Marcon (c4d13f1f-a785-4bcd-8e72-4ac4b28ee034)
-- Cria schema isolado com copias de todas as tabelas que tem dados relacionados aos 61 lotes.
-- Tabelas vazias tambem sao copiadas por seguranca (0 registros esperados).

CREATE SCHEMA IF NOT EXISTS backup_marcon_20260819;

-- 1. lotes (61 registros)
CREATE TABLE backup_marcon_20260819.lotes AS
  SELECT * FROM lotes
  WHERE fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND deleted_at IS NULL;

-- 2. lote_categorias (81 registros)
CREATE TABLE backup_marcon_20260819.lote_categorias AS
  SELECT lc.* FROM lote_categorias lc
  JOIN lotes l ON l.id = lc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 3. planos_nutricionais (41 registros)
CREATE TABLE backup_marcon_20260819.planos_nutricionais AS
  SELECT pn.* FROM planos_nutricionais pn
  JOIN lote_categorias lc ON lc.id = pn.lote_categoria_id
  JOIN lotes l ON l.id = lc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 4. planos_nutricionais_snapshots (41 registros)
CREATE TABLE backup_marcon_20260819.planos_nutricionais_snapshots AS
  SELECT pns.* FROM planos_nutricionais_snapshots pns
  JOIN lote_categorias lc ON lc.id = pns.lote_categoria_id
  JOIN lotes l ON l.id = lc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 5. registros_suplementacao (5 registros)
CREATE TABLE backup_marcon_20260819.registros_suplementacao AS
  SELECT rs.* FROM registros_suplementacao rs
  JOIN lotes l ON l.id = rs.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 6. lote_categorias_transicoes (0 registros, por seguranca)
CREATE TABLE backup_marcon_20260819.lote_categorias_transicoes AS
  SELECT lct.* FROM lote_categorias_transicoes lct
  JOIN lotes l ON l.id = lct.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 7. lote_historico (0 registros)
CREATE TABLE backup_marcon_20260819.lote_historico AS
  SELECT lh.* FROM lote_historico lh
  JOIN lotes l ON l.id = lh.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 8. lote_pasto_historico (0 registros)
CREATE TABLE backup_marcon_20260819.lote_pasto_historico AS
  SELECT lph.* FROM lote_pasto_historico lph
  JOIN lotes l ON l.id = lph.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 9. lote_modulo_historico (0 registros)
CREATE TABLE backup_marcon_20260819.lote_modulo_historico AS
  SELECT lmh.* FROM lote_modulo_historico lmh
  JOIN lotes l ON l.id = lmh.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 10. registros_movimentacao (0 registros, via lote_origem_id OU lote_destino_id)
CREATE TABLE backup_marcon_20260819.registros_movimentacao AS
  SELECT rm.* FROM registros_movimentacao rm
  JOIN lotes l ON l.id = rm.lote_origem_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL
  UNION
  SELECT rm.* FROM registros_movimentacao rm
  JOIN lotes l ON l.id = rm.lote_destino_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 11. registros_morte (0 registros)
CREATE TABLE backup_marcon_20260819.registros_morte AS
  SELECT rm.* FROM registros_morte rm
  JOIN lotes l ON l.id = rm.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 12. registros_maternidade (0 registros)
CREATE TABLE backup_marcon_20260819.registros_maternidade AS
  SELECT rm.* FROM registros_maternidade rm
  JOIN lotes l ON l.id = rm.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 13. registros_leitura_cocho (0 registros)
CREATE TABLE backup_marcon_20260819.registros_leitura_cocho AS
  SELECT rlc.* FROM registros_leitura_cocho rlc
  JOIN lotes l ON l.id = rlc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 14. registros_rodeio (0 registros)
CREATE TABLE backup_marcon_20260819.registros_rodeio AS
  SELECT rr.* FROM registros_rodeio rr
  JOIN lotes l ON l.id = rr.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 15. registros_enfermaria (0 registros)
CREATE TABLE backup_marcon_20260819.registros_enfermaria AS
  SELECT re.* FROM registros_enfermaria re
  JOIN lotes l ON l.id = re.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 16. registros_pastagens (0 registros)
CREATE TABLE backup_marcon_20260819.registros_pastagens AS
  SELECT rp.* FROM registros_pastagens rp
  JOIN lotes l ON l.id = rp.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 17. registros_bebedouros (0 registros)
CREATE TABLE backup_marcon_20260819.registros_bebedouros AS
  SELECT rb.* FROM registros_bebedouros rb
  JOIN lotes l ON l.id = rb.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 18. registros_oferta_trato (0 registros)
CREATE TABLE backup_marcon_20260819.registros_oferta_trato AS
  SELECT rot.* FROM registros_oferta_trato rot
  JOIN lotes l ON l.id = rot.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 19. currais (0 registros, via lote_id)
CREATE TABLE backup_marcon_20260819.currais AS
  SELECT c.* FROM currais c
  JOIN lotes l ON l.id = c.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 20. individuos (0 registros, via lote_atual)
CREATE TABLE backup_marcon_20260819.individuos AS
  SELECT i.* FROM individuos i
  JOIN lotes l ON l.id = i.lote_atual
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;

-- 21. programacao_tratos_currais (0 registros)
CREATE TABLE backup_marcon_20260819.programacao_tratos_currais AS
  SELECT ptc.* FROM programacao_tratos_currais ptc
  JOIN lotes l ON l.id = ptc.lote_id
  WHERE l.fazenda_id = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034' AND l.deleted_at IS NULL;;
