ALTER TABLE registros_pastagens
ADD COLUMN IF NOT EXISTS bebedouros_cochos TEXT,
ADD COLUMN IF NOT EXISTS pastagens_taxa_lotacao TEXT,
ADD COLUMN IF NOT EXISTS animais_machucados_doentes_bichados TEXT,
ADD COLUMN IF NOT EXISTS cercas_cochos_porteiras TEXT,
ADD COLUMN IF NOT EXISTS carrapatos_moscas TEXT,
ADD COLUMN IF NOT EXISTS animais_entreverados TEXT,
ADD COLUMN IF NOT EXISTS animal_morto TEXT;;
