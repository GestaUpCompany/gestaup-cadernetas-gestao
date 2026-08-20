CREATE TABLE setores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_setores_fazenda_id ON setores(fazenda_id);
CREATE INDEX idx_setores_deleted_at ON setores(deleted_at);

ALTER TABLE setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon select setores"
  ON setores FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon insert setores"
  ON setores FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon update setores"
  ON setores FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon delete setores"
  ON setores FOR DELETE
  TO anon
  USING (true);

GRANT INSERT ON setores TO anon;
GRANT SELECT ON setores TO anon;
GRANT UPDATE ON setores TO anon;
GRANT DELETE ON setores TO anon;;
