-- Add id_provisorio_cria column to individuos table
ALTER TABLE individuos 
ADD COLUMN id_provisorio_cria TEXT;

-- Add index for efficient lookup
CREATE INDEX idx_individuos_id_provisorio_cria ON individuos(id_provisorio_cria);;
