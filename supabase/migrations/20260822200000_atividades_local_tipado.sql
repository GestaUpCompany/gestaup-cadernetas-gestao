-- Adiciona referência tipada de local nas atividades e templates
-- local_tipo: 'pasto' | 'curral' | 'local' | 'maquina' | 'livre'
-- local_id: uuid nullable (referência a pastos.id, currais.id, locais.id ou maquinas_veiculos.id)
-- local: text já existente, mantido como snapshot do nome para exibição sem JOIN

ALTER TABLE atividades
  ADD COLUMN IF NOT EXISTS local_tipo text DEFAULT 'livre',
  ADD COLUMN IF NOT EXISTS local_id uuid;

ALTER TABLE atividade_templates
  ADD COLUMN IF NOT EXISTS local_tipo text DEFAULT 'livre',
  ADD COLUMN IF NOT EXISTS local_id uuid;

-- Backfill: registros com local preenchido mas local_tipo NULL viram 'livre'
UPDATE atividades SET local_tipo = 'livre' WHERE local IS NOT NULL AND local_tipo IS NULL;
UPDATE atividade_templates SET local_tipo = 'livre' WHERE local IS NOT NULL AND local_tipo IS NULL;

-- Registros sem local: local_tipo NULL -> 'livre'
UPDATE atividades SET local_tipo = 'livre' WHERE local_tipo IS NULL;
UPDATE atividade_templates SET local_tipo = 'livre' WHERE local_tipo IS NULL;

ALTER TABLE atividades ALTER COLUMN local_tipo SET DEFAULT 'livre';
ALTER TABLE atividade_templates ALTER COLUMN local_tipo SET DEFAULT 'livre';
