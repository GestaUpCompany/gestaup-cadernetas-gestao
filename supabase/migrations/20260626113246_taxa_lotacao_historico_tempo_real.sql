
-- View v_historico_ocupacao_pasto: taxa calculada em tempo real para ativos, persistida para encerrados
CREATE OR REPLACE VIEW public.v_historico_ocupacao_pasto AS
SELECT h.id AS historico_id,
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
    CASE
      WHEN h.data_hora_saida IS NULL THEN
        CASE
          WHEN (p.area_util_ha IS NOT NULL AND p.area_util_ha > 0) THEN
            ROUND((
              COALESCE((
                SELECT SUM((lc.quant_atual)::numeric * lc.peso_vivo_atual_kg_cab)
                FROM lote_categorias lc
                WHERE lc.lote_id = h.lote_id AND lc.quant_atual > 0 AND lc.peso_vivo_atual_kg_cab IS NOT NULL
              ), (h.cabecas_entrada)::numeric * h.peso_vivo_medio_entrada_kg)
              / 450.0) / p.area_util_ha, 2)
          ELSE NULL::numeric
        END
      ELSE h.taxa_lotacao_ua_ha
    END AS taxa_lotacao_ua_ha,
    CASE
      WHEN h.data_hora_saida IS NOT NULL THEN ROUND((EXTRACT(epoch FROM (h.data_hora_saida - h.data_hora_entrada)) / 86400.0), 2)
      ELSE NULL::numeric
    END AS periodo_ocupacao_dias,
    CASE
      WHEN h.data_hora_saida IS NOT NULL THEN ROUND((EXTRACT(epoch FROM (h.data_hora_saida - h.data_hora_entrada)) / 3600.0), 2)
      ELSE NULL::numeric
    END AS periodo_ocupacao_horas
FROM lote_pasto_historico h
JOIN lotes l ON h.lote_id = l.id
LEFT JOIN pastos p ON h.pasto_id = p.id
LEFT JOIN modulos_pastos m ON h.modulo_id = m.id
ORDER BY h.data_hora_entrada DESC;

-- View v_historico_ocupacao_modulo: taxa calculada em tempo real para ativos, persistida para encerrados
CREATE OR REPLACE VIEW public.v_historico_ocupacao_modulo AS
SELECT h.id AS historico_id,
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
    CASE
      WHEN h.data_hora_saida IS NULL THEN
        CASE
          WHEN (m.area_util_total_ha IS NOT NULL AND m.area_util_total_ha > 0) THEN
            ROUND(((
              SELECT COALESCE(
                SUM(COALESCE(
                  (SELECT SUM((lc2.quant_atual)::numeric * lc2.peso_vivo_atual_kg_cab)
                   FROM lote_categorias lc2
                   WHERE lc2.lote_id = h2.lote_id AND lc2.quant_atual > 0 AND lc2.peso_vivo_atual_kg_cab IS NOT NULL),
                  (h2.cabecas_entrada)::numeric * h2.peso_vivo_medio_entrada_kg
                )),
                0::numeric
              )
              FROM lote_modulo_historico h2
              WHERE h2.modulo_id = h.modulo_id AND h2.data_hora_saida IS NULL
            ) / 450.0) / m.area_util_total_ha, 2)
          ELSE NULL::numeric
        END
      ELSE h.taxa_lotacao_ua_ha
    END AS taxa_lotacao_ua_ha,
    CASE
      WHEN h.data_hora_saida IS NOT NULL THEN ROUND((EXTRACT(epoch FROM (h.data_hora_saida - h.data_hora_entrada)) / 86400.0), 2)
      ELSE NULL::numeric
    END AS periodo_ocupacao_dias,
    CASE
      WHEN h.data_hora_saida IS NOT NULL THEN ROUND((EXTRACT(epoch FROM (h.data_hora_saida - h.data_hora_entrada)) / 3600.0), 2)
      ELSE NULL::numeric
    END AS periodo_ocupacao_horas
FROM lote_modulo_historico h
JOIN lotes l ON h.lote_id = l.id
LEFT JOIN modulos_pastos m ON h.modulo_id = m.id
ORDER BY h.data_hora_entrada DESC;
;
