-- Remover colunas calculadas que não precisam estar no banco
ALTER TABLE lotes DROP COLUMN IF EXISTS dias_restantes_meta;
ALTER TABLE lotes DROP COLUMN IF EXISTS peso_vivo_kg;;
