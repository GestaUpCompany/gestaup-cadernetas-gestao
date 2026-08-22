-- Atividades nao previstas nao tem prioridade
ALTER TABLE atividades ALTER COLUMN prioridade DROP NOT NULL;
