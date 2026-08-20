-- Add temporary mother identification fields for orphan linking
ALTER TABLE individuos 
ADD COLUMN id_brinco_mae TEXT,
ADD COLUMN id_chip_mae TEXT;

-- Add indexes for efficient orphan lookup
CREATE INDEX idx_individuos_id_brinco_mae ON individuos(id_brinco_mae);
CREATE INDEX idx_individuos_id_chip_mae ON individuos(id_chip_mae);;
