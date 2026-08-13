-- ============================================================
-- Versionamento do mapa da fazenda
-- Permite que o PWA verifique se há dados novos sem baixar tudo
-- ============================================================

-- 1. Tabela de versão do mapa por fazenda
CREATE TABLE IF NOT EXISTS mapa_versao (
  fazenda_id UUID PRIMARY KEY REFERENCES fazendas(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS: peão (auth) pode ler a versão do mapa da sua fazenda
ALTER TABLE mapa_versao ENABLE ROW LEVEL SECURITY;

CREATE POLICY mapa_versao_select_fazenda ON mapa_versao
  FOR SELECT
  USING (
    fazenda_id IN (
      SELECT uf.fazenda_id
      FROM usuario_fazenda uf
      JOIN usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    )
  );

-- 3. Função que atualiza a versão do mapa de uma fazenda
-- Chamada pelas triggers nas tabelas de geometria
CREATE OR REPLACE FUNCTION touch_mapa_versao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tenta extrair fazenda_id do registro (NEW ou OLD)
  DECLARE
    v_fazenda_id UUID;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_fazenda_id := OLD.fazenda_id;
    ELSE
      v_fazenda_id := NEW.fazenda_id;
    END IF;

    IF v_fazenda_id IS NOT NULL THEN
      INSERT INTO mapa_versao (fazenda_id, updated_at)
      VALUES (v_fazenda_id, now())
      ON CONFLICT (fazenda_id)
      DO UPDATE SET updated_at = now();
    END IF;

    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
END;
$$;

-- 4. Triggers em todas as tabelas que contêm geometria do mapa
-- pastos
DROP TRIGGER IF EXISTS trg_mapa_versao_pastos ON pastos;
CREATE TRIGGER trg_mapa_versao_pastos
  AFTER INSERT OR UPDATE OF geometria OR DELETE ON pastos
  FOR EACH ROW
  EXECUTE FUNCTION touch_mapa_versao();

-- currais
DROP TRIGGER IF EXISTS trg_mapa_versao_currais ON currais;
CREATE TRIGGER trg_mapa_versao_currais
  AFTER INSERT OR UPDATE OF geometria OR DELETE ON currais
  FOR EACH ROW
  EXECUTE FUNCTION touch_mapa_versao();

-- mapa_estradas
DROP TRIGGER IF EXISTS trg_mapa_versao_estradas ON mapa_estradas;
CREATE TRIGGER trg_mapa_versao_estradas
  AFTER INSERT OR UPDATE OR DELETE ON mapa_estradas
  FOR EACH ROW
  EXECUTE FUNCTION touch_mapa_versao();

-- mapa_pontos
DROP TRIGGER IF EXISTS trg_mapa_versao_pontos ON mapa_pontos;
CREATE TRIGGER trg_mapa_versao_pontos
  AFTER INSERT OR UPDATE OR DELETE ON mapa_pontos
  FOR EACH ROW
  EXECUTE FUNCTION touch_mapa_versao();

-- 5. Backfill: criar versão inicial para todas as fazendas que já têm geometrias
INSERT INTO mapa_versao (fazenda_id, updated_at)
SELECT DISTINCT fazenda_id, now()
FROM pastos
WHERE geometria IS NOT NULL
ON CONFLICT (fazenda_id) DO NOTHING;

INSERT INTO mapa_versao (fazenda_id, updated_at)
SELECT DISTINCT fazenda_id, now()
FROM currais
WHERE geometria IS NOT NULL
ON CONFLICT (fazenda_id) DO NOTHING;

INSERT INTO mapa_versao (fazenda_id, updated_at)
SELECT DISTINCT fazenda_id, now()
FROM mapa_estradas
ON CONFLICT (fazenda_id) DO NOTHING;

INSERT INTO mapa_versao (fazenda_id, updated_at)
SELECT DISTINCT fazenda_id, now()
FROM mapa_pontos
ON CONFLICT (fazenda_id) DO NOTHING;
