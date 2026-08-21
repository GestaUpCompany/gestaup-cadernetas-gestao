
-- ============================================================================
-- Migrar lote_categorias existentes para planos_nutricionais
-- Para cada lote_categorias que possui formulacao_id, criar um plano vigente
-- ============================================================================
INSERT INTO public.planos_nutricionais (
  lote_categoria_id,
  fazenda_id,
  nome,
  formulacao_id,
  periodo_dias,
  peso_meta_kg,
  ordem,
  ativo,
  data_inicio,
  condicao_migracao
)
SELECT
  lc.id,
  l.fazenda_id,
  COALESCE(f.nome, 'Plano Inicial'),
  lc.formulacao_id,
  COALESCE(lc.periodo, 90),
  COALESCE(lc.peso_vivo_meta_kg_cab, 0),
  0,
  true,
  lc.data_pesagem,
  'periodo'
FROM public.lote_categorias lc
JOIN public.lotes l ON l.id = lc.lote_id
LEFT JOIN public.formulacoes f ON f.id = lc.formulacao_id
WHERE lc.formulacao_id IS NOT NULL
  AND lc.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM public.planos_nutricionais pn
    WHERE pn.lote_categoria_id = lc.id
  );

-- Para lote_categorias sem formulacao_id mas com estrategia_nutricional (texto),
-- tentar match por nome
INSERT INTO public.planos_nutricionais (
  lote_categoria_id,
  fazenda_id,
  nome,
  formulacao_id,
  periodo_dias,
  peso_meta_kg,
  ordem,
  ativo,
  data_inicio,
  condicao_migracao
)
SELECT
  lc.id,
  l.fazenda_id,
  COALESCE(lc.estrategia_nutricional, 'Plano Inicial'),
  f.id,
  COALESCE(lc.periodo, 90),
  COALESCE(lc.peso_vivo_meta_kg_cab, 0),
  0,
  true,
  lc.data_pesagem,
  'periodo'
FROM public.lote_categorias lc
JOIN public.lotes l ON l.id = lc.lote_id
JOIN public.formulacoes f ON LOWER(TRIM(f.nome)) = LOWER(TRIM(lc.estrategia_nutricional))
WHERE lc.formulacao_id IS NULL
  AND lc.estrategia_nutricional IS NOT NULL
  AND lc.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM public.planos_nutricionais pn
    WHERE pn.lote_categoria_id = lc.id
  );
;
