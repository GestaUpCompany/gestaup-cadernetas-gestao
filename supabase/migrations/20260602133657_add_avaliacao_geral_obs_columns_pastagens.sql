ALTER TABLE registros_pastagens
ADD COLUMN IF NOT EXISTS bebedouros_cochos_obs TEXT,
ADD COLUMN IF NOT EXISTS pastagens_taxa_lotacao_obs TEXT,
ADD COLUMN IF NOT EXISTS animais_machucados_doentes_bichados_obs TEXT,
ADD COLUMN IF NOT EXISTS cercas_cochos_porteiras_obs TEXT,
ADD COLUMN IF NOT EXISTS carrapatos_moscas_obs TEXT,
ADD COLUMN IF NOT EXISTS animais_entreverados_obs TEXT,
ADD COLUMN IF NOT EXISTS animal_morto_obs TEXT;;
