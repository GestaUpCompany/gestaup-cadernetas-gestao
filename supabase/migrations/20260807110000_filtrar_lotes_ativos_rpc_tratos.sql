-- Corrige RPCs de relatório público para filtrar lotes inativos em todos os pontos
-- Problema: lotes inativos apareciam no dropdown e nos dados dos relatórios
-- Correção: adicionar filtro l.ativo = true (ou IN (SELECT id FROM lotes WHERE ativo = true))
--   em lotes_disponiveis, linhas detalhadas, resumo e info_lotes
-- Aplica-se a: get_dados_relatorio_consumo e get_dados_relatorio_tratos

-- RPC de consumo: 4 pontos corrigidos
-- 1. v_lotes_disponiveis: JOIN lotes l ON l.id = regs.lote_id AND l.ativo = true
-- 2. registros_windowed: AND r.lote_id IN (SELECT id FROM lotes WHERE ativo = true)
-- 3. lotes_com_registros: AND lote_id IN (SELECT id FROM lotes WHERE ativo = true)
-- 4. info_lotes: JOIN lotes l ON l.id = lcr.lote_id AND l.ativo = true

-- RPC de tratos: 2 pontos corrigidos
-- 1. v_lotes_disponiveis: JOIN lotes l ON l.id = regs.lote_id AND l.ativo = true (já aplicado)
-- 2. regs (linhas detalhadas): JOIN lotes l ON l.id = r.lote_id AND l.ativo = true
--    (o resumo reaproveita regs_com_sugerido que herda o filtro)
