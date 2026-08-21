
-- Recriar views de histórico com taxa_lotacao_ua_ha
DROP VIEW IF EXISTS public.v_historico_ocupacao_pasto;
CREATE VIEW public.v_historico_ocupacao_pasto AS
SELECT
  h.id AS historico_id,
  h.lote_id,
  l.nome AS lote_nome,
  h.pasto_id,
  p.nome AS pasto_nome,
  h.modulo_id,
  m.nome AS modulo_nome,
  h.data_hora_entrada,
  h.data_hora_saida,
  h.cabecas_entrada,
  h.peso_vivo_medio_entrada_kg,
  h.cabecas_saida,
  h.peso_vivo_medio_saida_kg,
  h.meta_intervalo_ocupacao_dias,
  h.desvio_tempo_ocupacao_percent,
  h.taxa_lotacao_ua_ha,
  CASE
    WHEN h.data_hora_saida IS NOT NULL
    THEN round(EXTRACT(epoch FROM h.data_hora_saida - h.data_hora_entrada) / 86400.0, 2)
    ELSE NULL
  END AS periodo_ocupacao_dias,
  CASE
    WHEN h.data_hora_saida IS NOT NULL
    THEN round(EXTRACT(epoch FROM h.data_hora_saida - h.data_hora_entrada) / 3600.0, 2)
    ELSE NULL
  END AS periodo_ocupacao_horas
FROM public.lote_pasto_historico h
JOIN public.lotes l ON h.lote_id = l.id
LEFT JOIN public.pastos p ON h.pasto_id = p.id
LEFT JOIN public.modulos_pastos m ON h.modulo_id = m.id
ORDER BY h.data_hora_entrada DESC;

GRANT SELECT ON public.v_historico_ocupacao_pasto TO authenticated, anon;


DROP VIEW IF EXISTS public.v_historico_ocupacao_modulo;
CREATE VIEW public.v_historico_ocupacao_modulo AS
SELECT
  h.id AS historico_id,
  h.lote_id,
  l.nome AS lote_nome,
  h.modulo_id,
  m.nome AS modulo_nome,
  h.data_hora_entrada,
  h.data_hora_saida,
  h.cabecas_entrada,
  h.peso_vivo_medio_entrada_kg,
  h.cabecas_saida,
  h.peso_vivo_medio_saida_kg,
  h.meta_intervalo_ocupacao_dias,
  h.desvio_tempo_ocupacao_percent,
  h.taxa_lotacao_ua_ha,
  CASE
    WHEN h.data_hora_saida IS NOT NULL
    THEN round(EXTRACT(epoch FROM h.data_hora_saida - h.data_hora_entrada) / 86400.0, 2)
    ELSE NULL
  END AS periodo_ocupacao_dias,
  CASE
    WHEN h.data_hora_saida IS NOT NULL
    THEN round(EXTRACT(epoch FROM h.data_hora_saida - h.data_hora_entrada) / 3600.0, 2)
    ELSE NULL
  END AS periodo_ocupacao_horas
FROM public.lote_modulo_historico h
JOIN public.lotes l ON h.lote_id = l.id
LEFT JOIN public.modulos_pastos m ON h.modulo_id = m.id
ORDER BY h.data_hora_entrada DESC;

GRANT SELECT ON public.v_historico_ocupacao_modulo TO authenticated, anon;
;
