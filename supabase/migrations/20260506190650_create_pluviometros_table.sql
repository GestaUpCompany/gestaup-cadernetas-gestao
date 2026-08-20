CREATE TABLE pluviometros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE pluviometros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON pluviometros
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON pluviometros
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON pluviometros
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON pluviometros
FOR DELETE
TO authenticated
USING (true);;
