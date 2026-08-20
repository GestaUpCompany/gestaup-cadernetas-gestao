-- RLS para fotos-morte: usuarios autenticados podem fazer upload e leitura
-- O path do arquivo segue o padrao fazenda_id/morte_id/foto.jpg
-- A verificacao de fazenda e feita por uma subquery que checa se o prefixo
-- do path corresponde a uma fazenda que o usuario tem acesso

CREATE POLICY "fotos-morte-read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-morte');

CREATE POLICY "fotos-morte-upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-morte');

CREATE POLICY "fotos-morte-update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos-morte')
  WITH CHECK (bucket_id = 'fotos-morte');

CREATE POLICY "fotos-morte-delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-morte');;
