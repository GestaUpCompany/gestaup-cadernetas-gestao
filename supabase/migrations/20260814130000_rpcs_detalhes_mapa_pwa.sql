-- RPCs para detalhes de pasto e curral no mapa do PWA
-- Retorna pasto/curral + lote + categorias ativas + dietas (formulacoes)

CREATE OR REPLACE FUNCTION public.get_detalhes_pasto_mapa(p_pasto_id uuid)
RETURNS TABLE(
  pasto_id uuid,
  pasto_nome text,
  setor text,
  tipo text,
  area_total_ha numeric,
  area_util_ha numeric,
  especie text,
  metragem_cocho_m numeric,
  fonte_agua_principal text,
  modulo_nome text,
  lote_id uuid,
  lote_nome text,
  lote_cabecas bigint,
  lote_raca text,
  lote_sexo text,
  lote_peso_medio_kg numeric,
  categorias json
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.nome, p.setor, p.tipo, p.area_total_ha, p.area_util_ha,
    p.especie, p.metragem_cocho_m, p.fonte_agua_principal,
    mp.nome AS modulo_nome,
    l.id AS lote_id, l.nome AS lote_nome,
    COALESCE((SELECT SUM(lc.quant_atual) FROM lote_categorias lc WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0), 0),
    l.raca, l.sexo,
    CASE WHEN COALESCE((SELECT SUM(lc.quant_atual) FROM lote_categorias lc WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0), 0) > 0
      THEN round(COALESCE((SELECT SUM(lc.quant_atual * lc.peso_vivo_atual_kg_cab) FROM lote_categorias lc WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0 AND lc.peso_vivo_atual_kg_cab IS NOT NULL), 0) / COALESCE((SELECT SUM(lc.quant_atual) FROM lote_categorias lc WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0 AND lc.peso_vivo_atual_kg_cab IS NOT NULL), 1), 2)
      ELSE NULL END,
    (SELECT json_agg(json_build_object('categoria', lc.categoria, 'quant_atual', lc.quant_atual, 'peso_vivo_kg', lc.peso_vivo_atual_kg_cab, 'formulacao_nome', f.nome, 'formulacao_id', lc.formulacao_id))
     FROM lote_categorias lc LEFT JOIN formulacoes f ON f.id = lc.formulacao_id
     WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0)
  FROM pastos p
  LEFT JOIN modulos_pastos mp ON mp.id = p.modulo_id
  LEFT JOIN lotes l ON l.pasto_id = p.id AND l.deleted_at IS NULL
  WHERE p.id = p_pasto_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_detalhes_curral_mapa(p_curral_id uuid)
RETURNS TABLE(
  curral_id uuid,
  curral_nome text,
  largura_m numeric,
  comprimento_m numeric,
  metros_cocho_m numeric,
  formulacao_nome text,
  lote_id uuid,
  lote_nome text,
  lote_cabecas bigint,
  lote_raca text,
  lote_sexo text,
  lote_peso_medio_kg numeric,
  categorias json
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.nome,
    lc_conf.largura_m, lc_conf.comprimento_m, lc_conf.metros_cocho_m,
    f.nome AS formulacao_nome,
    l.id AS lote_id, l.nome AS lote_nome,
    COALESCE((SELECT SUM(lc.quant_atual) FROM lote_categorias lc WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0), 0),
    l.raca, l.sexo,
    CASE WHEN COALESCE((SELECT SUM(lc.quant_atual) FROM lote_categorias lc WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0), 0) > 0
      THEN round(COALESCE((SELECT SUM(lc.quant_atual * lc.peso_vivo_atual_kg_cab) FROM lote_categorias lc WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0 AND lc.peso_vivo_atual_kg_cab IS NOT NULL), 0) / COALESCE((SELECT SUM(lc.quant_atual) FROM lote_categorias lc WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0 AND lc.peso_vivo_atual_kg_cab IS NOT NULL), 1), 2)
      ELSE NULL END,
    (SELECT json_agg(json_build_object('categoria', lc.categoria, 'quant_atual', lc.quant_atual, 'peso_vivo_kg', lc.peso_vivo_atual_kg_cab, 'formulacao_nome', lf.nome, 'formulacao_id', lc.formulacao_id))
     FROM lote_categorias lc LEFT JOIN formulacoes lf ON lf.id = lc.formulacao_id
     WHERE lc.lote_id = l.id AND lc.ativo = true AND lc.quant_atual > 0)
  FROM currais c
  LEFT JOIN linhas_confinamento lc_conf ON lc_conf.id = c.linha_id
  LEFT JOIN formulacoes f ON f.id = c.formulacao_id
  LEFT JOIN lotes l ON l.id = c.lote_id AND l.deleted_at IS NULL
  WHERE c.id = p_curral_id
  LIMIT 1;
$$;
