-- Adiciona coluna nome à tabela vagoes (auto-populada com marca + modelo)
ALTER TABLE public.vagoes
ADD COLUMN IF NOT EXISTS nome text NULL;
