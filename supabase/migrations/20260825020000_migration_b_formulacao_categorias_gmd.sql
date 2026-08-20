-- ============================================================================
-- MIGRATION B — Tabela formulacao_categorias_gmd (GMD por categoria da fórmula)
-- ============================================================================
-- Objetivo: criar tabela que armazena o GMD por categoria para cada formulação.
-- Na nova arquitetura, a formulação tem um GMD diferente para cada categoria
-- que ela contempla. O input livre de GMD em formulacoes.gmd é substituído
-- por esta tabela.
--
-- Exclusões: "Tropa", "Bezerro ao pé", "Bezerra ao pé" não entram nesta tabela
-- (bezerros ao pé têm GMD padrão gerido em lote_categorias.gmd diretamente).
--
-- Backfill: usa lote_categorias.gmd como fonte de verdade (o cron já
-- materializa nessa coluna o GMD efetivo: COALESCE(pn.gmd_planejado, f.gmd)).
-- Para cada lote_categorias ativa com GMD e formulação (direta ou via plano),
-- insere (formulacao_id, categoria, gmd) na nova tabela.
-- ============================================================================

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS public.formulacao_categorias_gmd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulacao_id uuid NOT NULL REFERENCES public.formulacoes(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  gmd numeric(8,3) NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT formulacao_categorias_gmd_unique UNIQUE (formulacao_id, categoria)
);

-- 2. Índice para buscas por formulação
CREATE INDEX IF NOT EXISTS idx_formulacao_categorias_gmd_form
  ON public.formulacao_categorias_gmd(formulacao_id);

-- 3. RLS
ALTER TABLE public.formulacao_categorias_gmd ENABLE ROW LEVEL SECURITY;

-- 3.1 SELECT: peão só vê GMDs de formulações da sua fazenda
DROP POLICY IF EXISTS formulacao_categorias_gmd_select_fazenda ON public.formulacao_categorias_gmd;
CREATE POLICY formulacao_categorias_gmd_select_fazenda
  ON public.formulacao_categorias_gmd FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.formulacoes f
      WHERE f.id = formulacao_id
        AND f.fazenda_id = (
          SELECT uf.fazenda_id FROM public.usuario_fazenda uf
          WHERE uf.auth_id = auth.uid() LIMIT 1
        )
    )
  );

-- 3.2 INSERT: peão só insere GMDs em formulações da sua fazenda
DROP POLICY IF EXISTS formulacao_categorias_gmd_insert_fazenda ON public.formulacao_categorias_gmd;
CREATE POLICY formulacao_categorias_gmd_insert_fazenda
  ON public.formulacao_categorias_gmd FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formulacoes f
      WHERE f.id = formulacao_id
        AND f.fazenda_id = (
          SELECT uf.fazenda_id FROM public.usuario_fazenda uf
          WHERE uf.auth_id = auth.uid() LIMIT 1
        )
    )
  );

-- 3.3 UPDATE: peão só atualiza GMDs em formulações da sua fazenda
DROP POLICY IF EXISTS formulacao_categorias_gmd_update_fazenda ON public.formulacao_categorias_gmd;
CREATE POLICY formulacao_categorias_gmd_update_fazenda
  ON public.formulacao_categorias_gmd FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.formulacoes f
      WHERE f.id = formulacao_id
        AND f.fazenda_id = (
          SELECT uf.fazenda_id FROM public.usuario_fazenda uf
          WHERE uf.auth_id = auth.uid() LIMIT 1
        )
    )
  );

-- 3.4 DELETE: peão só deleta GMDs em formulações da sua fazenda
DROP POLICY IF EXISTS formulacao_categorias_gmd_delete_fazenda ON public.formulacao_categorias_gmd;
CREATE POLICY formulacao_categorias_gmd_delete_fazenda
  ON public.formulacao_categorias_gmd FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.formulacoes f
      WHERE f.id = formulacao_id
        AND f.fazenda_id = (
          SELECT uf.fazenda_id FROM public.usuario_fazenda uf
          WHERE uf.auth_id = auth.uid() LIMIT 1
        )
    )
  );

-- 4. Backfill: usar lote_categorias.gmd como fonte de verdade
--    O cron já materializa em lote_categorias.gmd o GMD efetivo:
--    COALESCE(pn.gmd_planejado, f.gmd).
--    Para cada lote_categorias ativa com GMD e formulação (direta ou via plano),
--    insere (formulacao_id, categoria, gmd) na nova tabela.
--    Em caso de conflito (mesma formulação + categoria com GMDs diferentes),
--    prefere o GMD do plano com gmd_planejado não-NULL.
INSERT INTO public.formulacao_categorias_gmd (formulacao_id, categoria, gmd, ordem)
SELECT DISTINCT ON (COALESCE(lc.formulacao_id, pn.formulacao_id), lc.categoria)
  COALESCE(lc.formulacao_id, pn.formulacao_id) AS formulacao_id,
  lc.categoria,
  COALESCE(pn.gmd_planejado, NULLIF(lc.gmd, '')::numeric, f.gmd) AS gmd,
  0 AS ordem
FROM public.lote_categorias lc
LEFT JOIN public.planos_nutricionais pn
  ON pn.lote_categoria_id = lc.id AND pn.ativo = true
LEFT JOIN public.formulacoes f
  ON f.id = COALESCE(lc.formulacao_id, pn.formulacao_id)
WHERE lc.ativo = true
  AND lc.data_fim IS NULL
  AND COALESCE(lc.formulacao_id, pn.formulacao_id) IS NOT NULL
  AND lc.categoria IS NOT NULL
  AND lc.categoria NOT IN (
    'Tropa',
    'Bezerro ao pé', 'Bezerro ao Pé',
    'Bezerra ao pé', 'Bezerra ao Pé'
  )
  AND COALESCE(pn.gmd_planejado, NULLIF(lc.gmd, '')::numeric, f.gmd) IS NOT NULL
ORDER BY
  COALESCE(lc.formulacao_id, pn.formulacao_id),
  lc.categoria,
  (pn.gmd_planejado IS NOT NULL) DESC
ON CONFLICT (formulacao_id, categoria) DO NOTHING;
