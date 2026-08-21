ALTER TABLE registros_maternidade ADD COLUMN IF NOT EXISTS parto_vinculo_id UUID;
CREATE INDEX IF NOT EXISTS idx_maternidade_vinculo ON registros_maternidade(parto_vinculo_id) WHERE parto_vinculo_id IS NOT NULL;;
