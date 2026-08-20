
-- Step 1: Create enum types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maquina_veiculo_tipo') THEN
        CREATE TYPE maquina_veiculo_tipo AS ENUM ('Maquina', 'Veiculo');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maquina_veiculo_categoria') THEN
        CREATE TYPE maquina_veiculo_categoria AS ENUM (
            'Trator', 'Colheitadeira', 'Caminhao', 'Carro', 'Motocicleta',
            'Pulverizador', 'Adubadeira', 'Semeadora', 'Grade', 'Subsolador',
            'Plaina', 'Rocadeira', 'Guincho', 'Outro'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maquina_veiculo_status') THEN
        CREATE TYPE maquina_veiculo_status AS ENUM ('Ativo', 'Inativo', 'Manutencao');
    END IF;
END $$;

-- Step 2: Drop check constraints and default
ALTER TABLE maquinas_veiculos 
    DROP CONSTRAINT IF EXISTS maquinas_veiculos_tipo_check,
    DROP CONSTRAINT IF EXISTS maquinas_veiculos_categoria_check,
    DROP CONSTRAINT IF EXISTS maquinas_veiculos_status_check;

ALTER TABLE maquinas_veiculos ALTER COLUMN status DROP DEFAULT;

-- Step 3: Add outro_categoria column
ALTER TABLE maquinas_veiculos 
    ADD COLUMN IF NOT EXISTS outro_categoria TEXT;

-- Step 4: Alter columns to use enum types
ALTER TABLE maquinas_veiculos
    ALTER COLUMN tipo TYPE maquina_veiculo_tipo USING tipo::maquina_veiculo_tipo,
    ALTER COLUMN categoria TYPE maquina_veiculo_categoria USING categoria::maquina_veiculo_categoria,
    ALTER COLUMN status TYPE maquina_veiculo_status USING status::maquina_veiculo_status;

-- Step 5: Restore default with correct type
ALTER TABLE maquinas_veiculos ALTER COLUMN status SET DEFAULT 'Ativo';
;
