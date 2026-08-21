-- Policy mais simples para leitura do mapa_versao: qualquer usuario autenticado pode ler
-- A policy anterior faz JOIN com usuario_fazenda que pode falhar no PWA
DROP POLICY IF EXISTS mapa_versao_select_fazenda ON mapa_versao;
CREATE POLICY mapa_versao_select_authenticated ON mapa_versao
    FOR SELECT
    TO authenticated
    USING (true);

-- Tambem permitir leitura para anon (o PWA pode usar anon key em alguns fluxos)
CREATE POLICY mapa_versao_select_anon ON mapa_versao
    FOR SELECT
    TO anon
    USING (true);;
