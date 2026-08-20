-- Adicionar campo JSON para medições dinâmicas
ALTER TABLE registros_clima ADD COLUMN IF NOT EXISTS medicoes JSONB DEFAULT '[]'::jsonb;

-- Remover os campos fixos de pluviômetros
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_1_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_1_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_2_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_2_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_3_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_3_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_4_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_4_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_5_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_5_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_6_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_6_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_7_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_7_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_8_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_8_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_9_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_9_medicao;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_10_id;
ALTER TABLE registros_clima DROP COLUMN IF EXISTS pluviometro_10_medicao;;
