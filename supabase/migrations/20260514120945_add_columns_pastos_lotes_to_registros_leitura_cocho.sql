-- Adicionar colunas pasto e lote (texto) para compatibilidade com frontend
ALTER TABLE registros_leitura_cocho ADD COLUMN IF NOT EXISTS pasto TEXT;
ALTER TABLE registros_leitura_cocho ADD COLUMN IF NOT EXISTS lote TEXT;;
