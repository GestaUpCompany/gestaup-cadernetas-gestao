-- Adicionar todas as colunas faltantes na tabela lotes
ALTER TABLE lotes 
ADD COLUMN IF NOT EXISTS peso_vivo_meta_kg numeric,
ADD COLUMN IF NOT EXISTS peso_entrada_kg numeric,
ADD COLUMN IF NOT EXISTS gmd numeric,
ADD COLUMN IF NOT EXISTS data_pesagem date,
ADD COLUMN IF NOT EXISTS data_meta date;;
