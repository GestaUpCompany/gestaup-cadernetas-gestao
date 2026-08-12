-- Migration: adicionar colunas de geometria PostGIS para pastos, bebedouros e fazendas
-- Criar tabelas mapa_estradas e mapa_pontos para elementos sem tabela própria
-- Índices GIST para queries espaciais (ST_Contains, ST_Distance, ST_DWithin)
-- RLS seguindo o padrão fazenda_id IN (SELECT ... FROM usuario_fazenda ...)
-- PostGIS 3.3.7 já ativo no projeto nrwljcvhwbezmoummxbl

-- Verifica que PostGIS está ativo (falha cedo se não estiver)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION 'PostGIS extension is not installed. Run: CREATE EXTENSION postgis;';
  END IF;
END $$;

-- ==================== Colunas em tabelas existentes ====================

-- pastos.geometria: polígono do limite do pasto
ALTER TABLE public.pastos
  ADD COLUMN IF NOT EXISTS geometria geometry(Polygon, 4326);

-- bebedouros.geometria: ponto da localização do bebedouro
ALTER TABLE public.bebedouros
  ADD COLUMN IF NOT EXISTS geometria geometry(Point, 4326);

-- fazendas.bounding_box: perímetro da fazenda (define área de download de tiles no futuro)
ALTER TABLE public.fazendas
  ADD COLUMN IF NOT EXISTS bounding_box geometry(Polygon, 4326);

-- ==================== Tabelas novas ====================

-- mapa_estradas: estradas internas da fazenda (LineString), para routing no futuro
CREATE TABLE IF NOT EXISTS public.mapa_estradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  geometria geometry(LineString, 4326) NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- mapa_pontos: pontos de interesse sem tabela própria (cochos, portões, saleiros, currais de manejo)
CREATE TABLE IF NOT EXISTS public.mapa_pontos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  tipo text NOT NULL,  -- 'cocho', 'portao', 'saleiro', 'curral_manejo', etc.
  nome text NOT NULL,
  geometria geometry(Point, 4326) NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== Índices GIST ====================

CREATE INDEX IF NOT EXISTS pastos_geometria_gist ON public.pastos USING GIST (geometria);
CREATE INDEX IF NOT EXISTS bebedouros_geometria_gist ON public.bebedouros USING GIST (geometria);
CREATE INDEX IF NOT EXISTS fazendas_bounding_box_gist ON public.fazendas USING GIST (bounding_box);
CREATE INDEX IF NOT EXISTS mapa_estradas_geometria_gist ON public.mapa_estradas USING GIST (geometria);
CREATE INDEX IF NOT EXISTS mapa_pontos_geometria_gist ON public.mapa_pontos USING GIST (geometria);

-- Índices auxiliares para filtro por fazenda (queries comuns)
CREATE INDEX IF NOT EXISTS mapa_estradas_fazenda_id_idx ON public.mapa_estradas (fazenda_id);
CREATE INDEX IF NOT EXISTS mapa_pontos_fazenda_id_idx ON public.mapa_pontos (fazenda_id);
CREATE INDEX IF NOT EXISTS mapa_pontos_fazenda_tipo_idx ON public.mapa_pontos (fazenda_id, tipo);

-- ==================== updated_at triggers ====================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mapa_estradas_set_updated_at ON public.mapa_estradas;
CREATE TRIGGER mapa_estradas_set_updated_at
  BEFORE UPDATE ON public.mapa_estradas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS mapa_pontos_set_updated_at ON public.mapa_pontos;
CREATE TRIGGER mapa_pontos_set_updated_at
  BEFORE UPDATE ON public.mapa_pontos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== RLS ====================

-- Habilitar RLS nas tabelas novas
ALTER TABLE public.mapa_estradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapa_pontos ENABLE ROW LEVEL SECURITY;

-- Helper: fazendas que o usuário autenticado pode acessar
-- (mesmo padrão usado no resto do sistema: usuarios.auth_id = auth.uid() com usuario_fazenda.ativo)
-- As policies abaixo seguem exatamente este padrão.

-- mapa_estradas: SELECT
DROP POLICY IF EXISTS "mapa_estradas_select_fazenda" ON public.mapa_estradas;
CREATE POLICY "mapa_estradas_select_fazenda" ON public.mapa_estradas
  FOR SELECT TO authenticated
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- mapa_estradas: INSERT
DROP POLICY IF EXISTS "mapa_estradas_insert_fazenda" ON public.mapa_estradas;
CREATE POLICY "mapa_estradas_insert_fazenda" ON public.mapa_estradas
  FOR INSERT TO authenticated
  WITH CHECK (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- mapa_estradas: UPDATE
DROP POLICY IF EXISTS "mapa_estradas_update_fazenda" ON public.mapa_estradas;
CREATE POLICY "mapa_estradas_update_fazenda" ON public.mapa_estradas
  FOR UPDATE TO authenticated
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  )
  WITH CHECK (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- mapa_estradas: DELETE
DROP POLICY IF EXISTS "mapa_estradas_delete_fazenda" ON public.mapa_estradas;
CREATE POLICY "mapa_estradas_delete_fazenda" ON public.mapa_estradas
  FOR DELETE TO authenticated
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- mapa_pontos: SELECT
DROP POLICY IF EXISTS "mapa_pontos_select_fazenda" ON public.mapa_pontos;
CREATE POLICY "mapa_pontos_select_fazenda" ON public.mapa_pontos
  FOR SELECT TO authenticated
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- mapa_pontos: INSERT
DROP POLICY IF EXISTS "mapa_pontos_insert_fazenda" ON public.mapa_pontos;
CREATE POLICY "mapa_pontos_insert_fazenda" ON public.mapa_pontos
  FOR INSERT TO authenticated
  WITH CHECK (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- mapa_pontos: UPDATE
DROP POLICY IF EXISTS "mapa_pontos_update_fazenda" ON public.mapa_pontos;
CREATE POLICY "mapa_pontos_update_fazenda" ON public.mapa_pontos
  FOR UPDATE TO authenticated
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  )
  WITH CHECK (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- mapa_pontos: DELETE
DROP POLICY IF EXISTS "mapa_pontos_delete_fazenda" ON public.mapa_pontos;
CREATE POLICY "mapa_pontos_delete_fazenda" ON public.mapa_pontos
  FOR DELETE TO authenticated
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM public.usuario_fazenda uf
      JOIN public.usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- Nota: as colunas geometria em pastos, bebedouros e fazendas são cobertas
-- pelas policies existentes dessas tabelas (que já filtram por fazenda_id).
-- Não há policies adicionais necessárias para as novas colunas.

-- Nota: as colunas geometria são nullable. Os 1294 pastos, 501 bebedouros e
-- 44 fazendas existentes começam com geometria=NULL e são populados conforme
-- o usuário desenha ou importa no Painel Web. Sem backfill obrigatório.

-- ==================== Grants de tabela ====================
-- O Supabase não concede automaticamente SELECT/INSERT/UPDATE/DELETE
-- em tabelas novas para os roles authenticated/anon. Precisamos conceder
-- explicitamente para que as RLS policies funcionem via API REST.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapa_estradas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapa_pontos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapa_estradas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapa_pontos TO anon;
