
-- Create enum for medicamentos tipo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medicamento_tipo') THEN
        CREATE TYPE medicamento_tipo AS ENUM (
            'Antibiotico',
            'Vermifugo',
            'Carrapaticida',
            'Vacina',
            'Anti_inflamatorio',
            'Analgesico',
            'Hormonio',
            'Vitamina_Mineral',
            'Probiotico',
            'Anti_stress',
            'Coccidiostatico',
            'Fluido_oral',
            'Outro'
        );
    END IF;
END $$;

-- Add outro_tipo column
ALTER TABLE medicamentos ADD COLUMN IF NOT EXISTS outro_tipo TEXT;

-- Convert tipo column to enum
ALTER TABLE medicamentos
    ALTER COLUMN tipo TYPE medicamento_tipo USING tipo::medicamento_tipo;
;
