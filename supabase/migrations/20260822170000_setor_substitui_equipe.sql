-- Setor assume o papel de Equipe
-- 1. Adiciona setor_id em funcionarios
-- 2. Limpa equipe_id de funcionarios e atividades
-- 3. Dropa FKs, colunas e tabela equipes

ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES setores(id);

-- Limpar referencias antes de dropar
UPDATE funcionarios SET equipe_id = NULL;
UPDATE atividades SET equipe_id = NULL;

-- Dropar FKs
ALTER TABLE funcionarios DROP CONSTRAINT IF EXISTS funcionarios_equipe_id_fkey;
ALTER TABLE atividades DROP CONSTRAINT IF EXISTS atividades_equipe_id_fkey;

-- Dropar colunas
ALTER TABLE funcionarios DROP COLUMN IF EXISTS equipe_id;
ALTER TABLE atividades DROP COLUMN IF EXISTS equipe_id;

-- Dropar tabela
DROP TABLE IF EXISTS equipes CASCADE;
