-- Criar bucket para logos de fazendas (idempotente: não falha se bucket já existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de acesso público para leitura
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public USING (bucket_id = 'logos');

-- Política de upload para usuários autenticados (pode ser ajustado depois)
DROP POLICY IF EXISTS "Upload Logos" ON storage.objects;
CREATE POLICY "Upload Logos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'logos');

-- Política de update para usuários autenticados
DROP POLICY IF EXISTS "Update Logos" ON storage.objects;
CREATE POLICY "Update Logos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'logos');

-- Política de delete para usuários autenticados
DROP POLICY IF EXISTS "Delete Logos" ON storage.objects;
CREATE POLICY "Delete Logos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'logos');
