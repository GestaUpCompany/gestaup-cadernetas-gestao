-- Adiciona coluna 'local' na tabela atividades
ALTER TABLE atividades ADD COLUMN IF NOT EXISTS local TEXT;
