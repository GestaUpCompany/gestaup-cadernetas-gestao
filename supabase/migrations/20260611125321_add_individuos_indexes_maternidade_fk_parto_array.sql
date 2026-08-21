
-- Step 1: Drop old single-value parto constraint
ALTER TABLE individuos DROP CONSTRAINT IF EXISTS individuos_parto_check;

-- Step 2: Change column type from text to text[]
ALTER TABLE individuos ALTER COLUMN parto TYPE text[] USING 
  CASE WHEN parto IS NULL THEN NULL ELSE ARRAY[parto] END;

-- Step 3: Add new array-friendly parto constraint
ALTER TABLE individuos ADD CONSTRAINT individuos_parto_check
  CHECK (parto <@ ARRAY[
    'Aborto'::text,
    'Auxiliado'::text,
    'Cesárea'::text,
    'Deficiência Física'::text,
    'Distócico'::text,
    'Gêmeos'::text,
    'Natimorto'::text,
    'Normal'::text,
    'Retenção de Placenta'::text
  ]);

-- Step 4: Indexes for fast lookups by ID fields within a farm
CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_manejo ON individuos(fazenda_id, id_manejo);
CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_brinco ON individuos(fazenda_id, id_brinco);
CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_chip ON individuos(fazenda_id, id_chip);
CREATE INDEX IF NOT EXISTS idx_individuos_fazenda_id ON individuos(fazenda_id);

-- Step 5: Add FK columns to registros_maternidade for animal linkage
ALTER TABLE registros_maternidade
  ADD COLUMN IF NOT EXISTS individuo_id_mae uuid REFERENCES individuos(id),
  ADD COLUMN IF NOT EXISTS individuo_id_cria uuid REFERENCES individuos(id);
;
