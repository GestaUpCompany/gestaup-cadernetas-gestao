
-- Fase 3: Views e Performance

-- 1. View: ocupação atual por pasto
CREATE OR REPLACE VIEW public.v_lote_pasto_ocupacao_atual AS
SELECT 
  h.id as historico_id,
  h.lote_id,
  l.nome as lote_nome,
  h.pasto_id,
  p.nome as pasto_nome,
  h.modulo_id,
  m.nome as modulo_nome,
  h.data_hora_entrada,
  h.cabecas_entrada,
  h.peso_vivo_medio_entrada_kg,
  h.meta_intervalo_ocupacao_dias,
  ROUND(EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 86400.0, 2) as periodo_ocupacao_dias,
  ROUND(EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 3600.0, 2) as periodo_ocupacao_horas,
  CASE 
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL THEN
      GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 86400.0 - h.meta_intervalo_ocupacao_dias, 2))
    ELSE NULL
  END as dias_acima_meta,
  CASE 
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL AND h.meta_intervalo_ocupacao_dias > 0 THEN
      ROUND(
        ((EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 86400.0 - h.meta_intervalo_ocupacao_dias) 
        / h.meta_intervalo_ocupacao_dias * 100)::numeric, 2
      )
    ELSE NULL
  END as desvio_percentual_atual,
  CASE 
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL 
      AND EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 86400.0 > h.meta_intervalo_ocupacao_dias 
    THEN true
    ELSE false
  END as meta_excedida
FROM public.lote_pasto_historico h
JOIN public.lotes l ON h.lote_id = l.id
LEFT JOIN public.pastos p ON h.pasto_id = p.id
LEFT JOIN public.modulos_pastos m ON h.modulo_id = m.id
WHERE h.data_hora_saida IS NULL;

-- 2. View: ocupação atual por módulo
CREATE OR REPLACE VIEW public.v_lote_modulo_ocupacao_atual AS
SELECT 
  h.id as historico_id,
  h.lote_id,
  l.nome as lote_nome,
  h.modulo_id,
  m.nome as modulo_nome,
  h.data_hora_entrada,
  h.cabecas_entrada,
  h.peso_vivo_medio_entrada_kg,
  h.meta_intervalo_ocupacao_dias,
  ROUND(EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 86400.0, 2) as periodo_ocupacao_dias,
  ROUND(EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 3600.0, 2) as periodo_ocupacao_horas,
  CASE 
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL THEN
      GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 86400.0 - h.meta_intervalo_ocupacao_dias, 2))
    ELSE NULL
  END as dias_acima_meta,
  CASE 
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL AND h.meta_intervalo_ocupacao_dias > 0 THEN
      ROUND(
        ((EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 86400.0 - h.meta_intervalo_ocupacao_dias) 
        / h.meta_intervalo_ocupacao_dias * 100)::numeric, 2
      )
    ELSE NULL
  END as desvio_percentual_atual,
  CASE 
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL 
      AND EXTRACT(EPOCH FROM (now() - h.data_hora_entrada)) / 86400.0 > h.meta_intervalo_ocupacao_dias 
    THEN true
    ELSE false
  END as meta_excedida
FROM public.lote_modulo_historico h
JOIN public.lotes l ON h.lote_id = l.id
LEFT JOIN public.modulos_pastos m ON h.modulo_id = m.id
WHERE h.data_hora_saida IS NULL;

-- 3. View: histórico completo de ocupação por pasto
CREATE OR REPLACE VIEW public.v_historico_ocupacao_pasto AS
SELECT 
  h.id as historico_id,
  h.lote_id,
  l.nome as lote_nome,
  h.pasto_id,
  p.nome as pasto_nome,
  h.modulo_id,
  m.nome as modulo_nome,
  h.data_hora_entrada,
  h.data_hora_saida,
  h.cabecas_entrada,
  h.peso_vivo_medio_entrada_kg,
  h.cabecas_saida,
  h.peso_vivo_medio_saida_kg,
  h.meta_intervalo_ocupacao_dias,
  h.desvio_tempo_ocupacao_percent,
  CASE 
    WHEN h.data_hora_saida IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (h.data_hora_saida - h.data_hora_entrada)) / 86400.0, 2)
    ELSE NULL
  END as periodo_ocupacao_dias,
  CASE 
    WHEN h.data_hora_saida IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (h.data_hora_saida - h.data_hora_entrada)) / 3600.0, 2)
    ELSE NULL
  END as periodo_ocupacao_horas
FROM public.lote_pasto_historico h
JOIN public.lotes l ON h.lote_id = l.id
LEFT JOIN public.pastos p ON h.pasto_id = p.id
LEFT JOIN public.modulos_pastos m ON h.modulo_id = m.id
ORDER BY h.data_hora_entrada DESC;

-- 4. View: histórico completo de ocupação por módulo
CREATE OR REPLACE VIEW public.v_historico_ocupacao_modulo AS
SELECT 
  h.id as historico_id,
  h.lote_id,
  l.nome as lote_nome,
  h.modulo_id,
  m.nome as modulo_nome,
  h.data_hora_entrada,
  h.data_hora_saida,
  h.cabecas_entrada,
  h.peso_vivo_medio_entrada_kg,
  h.cabecas_saida,
  h.peso_vivo_medio_saida_kg,
  h.meta_intervalo_ocupacao_dias,
  h.desvio_tempo_ocupacao_percent,
  CASE 
    WHEN h.data_hora_saida IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (h.data_hora_saida - h.data_hora_entrada)) / 86400.0, 2)
    ELSE NULL
  END as periodo_ocupacao_dias,
  CASE 
    WHEN h.data_hora_saida IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (h.data_hora_saida - h.data_hora_entrada)) / 3600.0, 2)
    ELSE NULL
  END as periodo_ocupacao_horas
FROM public.lote_modulo_historico h
JOIN public.lotes l ON h.lote_id = l.id
LEFT JOIN public.modulos_pastos m ON h.modulo_id = m.id
ORDER BY h.data_hora_entrada DESC;

-- 5. View auxiliar: notificações pendentes de ocupação
CREATE OR REPLACE VIEW public.v_notificacoes_pendentes_ocupacao AS
SELECT 
  n.*,
  CASE 
    WHEN n.mensagem ILIKE '%pasto%' THEN 'pasto'
    WHEN n.mensagem ILIKE '%módulo%' OR n.mensagem ILIKE '%modulo%' THEN 'modulo'
    ELSE 'outro'
  END as tipo_ocupacao
FROM public.notificacoes n
WHERE n.tipo = 'warning'
  AND n.lida = false
  AND n.deleted_at IS NULL;
;
