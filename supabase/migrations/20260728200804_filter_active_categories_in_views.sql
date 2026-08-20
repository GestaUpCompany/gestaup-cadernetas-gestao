-- 1. Corrigir função calcular_peso_medio_lote para considerar apenas categorias ativas
CREATE OR REPLACE FUNCTION public.calcular_peso_medio_lote(p_lote_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_peso numeric;
BEGIN
  SELECT 
    SUM(c.quant_atual * c.peso_vivo_atual_kg_cab) / NULLIF(SUM(c.quant_atual), 0)
  INTO v_peso
  FROM public.lote_categorias c
  WHERE c.lote_id = p_lote_id
    AND c.ativo = true
    AND c.quant_atual > 0
    AND c.peso_vivo_atual_kg_cab IS NOT NULL;

  RETURN v_peso;
END;
$function$;

-- 2. Recriar v_lote_pasto_ocupacao_atual filtrando categorias ativas
CREATE OR REPLACE VIEW public.v_lote_pasto_ocupacao_atual AS
SELECT h.id AS historico_id,
    h.lote_id,
    l.nome AS lote_nome,
    h.pasto_id,
    p.nome AS pasto_nome,
    h.modulo_id,
    m.nome AS modulo_nome,
    h.data_hora_entrada,
    h.cabecas_entrada,
    h.peso_vivo_medio_entrada_kg,
    h.meta_intervalo_ocupacao_dias,
    COALESCE(( SELECT sum(lc.quant_atual) AS sum
           FROM lote_categorias lc
          WHERE ((lc.lote_id = h.lote_id) AND (lc.ativo = true) AND (lc.quant_atual > 0))), (h.cabecas_entrada)::bigint) AS cabecas_atual,
    COALESCE(calcular_peso_medio_lote(h.lote_id), h.peso_vivo_medio_entrada_kg) AS peso_vivo_medio_atual_kg,
        CASE
            WHEN ((p.area_util_ha IS NOT NULL) AND (p.area_util_ha > (0)::numeric)) THEN round(((COALESCE(( SELECT sum(((lc.quant_atual)::numeric * lc.peso_vivo_atual_kg_cab)) AS sum
               FROM lote_categorias lc
              WHERE ((lc.lote_id = h.lote_id) AND (lc.ativo = true) AND (lc.quant_atual > 0) AND (lc.peso_vivo_atual_kg_cab IS NOT NULL))), ((h.cabecas_entrada)::numeric * h.peso_vivo_medio_entrada_kg)) / 450.0) / p.area_util_ha), 2)
            ELSE NULL::numeric
        END AS taxa_lotacao_ua_ha,
    round((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 86400.0), 2) AS periodo_ocupacao_dias,
    round((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 3600.0), 2) AS periodo_ocupacao_horas,
        CASE
            WHEN (h.meta_intervalo_ocupacao_dias IS NOT NULL) THEN GREATEST((0)::numeric, round(((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 86400.0) - (h.meta_intervalo_ocupacao_dias)::numeric), 2))
            ELSE NULL::numeric
        END AS dias_acima_meta,
        CASE
            WHEN ((h.meta_intervalo_ocupacao_dias IS NOT NULL) AND (h.meta_intervalo_ocupacao_dias > 0)) THEN round(((((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 86400.0) - (h.meta_intervalo_ocupacao_dias)::numeric) / (h.meta_intervalo_ocupacao_dias)::numeric) * 100.0), 2)
            ELSE NULL::numeric
        END AS desvio_percentual_atual,
        CASE
            WHEN ((h.meta_intervalo_ocupacao_dias IS NOT NULL) AND ((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 86400.0) > (h.meta_intervalo_ocupacao_dias)::numeric)) THEN true
            ELSE false
        END AS meta_excedida
   FROM (((lote_pasto_historico h
     JOIN lotes l ON ((h.lote_id = l.id)))
     LEFT JOIN pastos p ON ((h.pasto_id = p.id)))
     LEFT JOIN modulos_pastos m ON ((h.modulo_id = p.modulo_id)))
  WHERE (h.data_hora_saida IS NULL);

-- 3. Recriar v_lote_modulo_ocupacao_atual filtrando categorias ativas
CREATE OR REPLACE VIEW public.v_lote_modulo_ocupacao_atual AS
SELECT h.id AS historico_id,
    h.lote_id,
    l.nome AS lote_nome,
    h.modulo_id,
    m.nome AS modulo_nome,
    h.data_hora_entrada,
    h.cabecas_entrada,
    h.peso_vivo_medio_entrada_kg,
    h.meta_intervalo_ocupacao_dias,
    COALESCE(( SELECT sum(lc.quant_atual) AS sum
           FROM lote_categorias lc
          WHERE ((lc.lote_id = h.lote_id) AND (lc.ativo = true) AND (lc.quant_atual > 0))), (h.cabecas_entrada)::bigint) AS cabecas_atual,
    COALESCE(calcular_peso_medio_lote(h.lote_id), h.peso_vivo_medio_entrada_kg) AS peso_vivo_medio_atual_kg,
        CASE
            WHEN ((m.area_util_total_ha IS NOT NULL) AND (m.area_util_total_ha > (0)::numeric)) THEN round(((( SELECT COALESCE(sum(COALESCE(( SELECT sum(((lc2.quant_atual)::numeric * lc2.peso_vivo_atual_kg_cab)) AS sum
                       FROM lote_categorias lc2
                      WHERE ((lc2.lote_id = h2.lote_id) AND (lc2.ativo = true) AND (lc2.quant_atual > 0) AND (lc2.peso_vivo_atual_kg_cab IS NOT NULL))), ((h2.cabecas_entrada)::numeric * h2.peso_vivo_medio_entrada_kg))), (0)::numeric) AS "coalesce"
               FROM lote_modulo_historico h2
              WHERE ((h2.modulo_id = h.modulo_id) AND (h2.data_hora_saida IS NULL))) / 450.0) / m.area_util_total_ha), 2)
            ELSE NULL::numeric
        END AS taxa_lotacao_ua_ha,
    round((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 86400.0), 2) AS periodo_ocupacao_dias,
    round((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 3600.0), 2) AS periodo_ocupacao_horas,
        CASE
            WHEN (h.meta_intervalo_ocupacao_dias IS NOT NULL) THEN GREATEST((0)::numeric, round(((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 86400.0) - (h.meta_intervalo_ocupacao_dias)::numeric), 2))
            ELSE NULL::numeric
        END AS dias_acima_meta,
        CASE
            WHEN ((h.meta_intervalo_ocupacao_dias IS NOT NULL) AND (h.meta_intervalo_ocupacao_dias > 0)) THEN round(((((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 86400.0) - (h.meta_intervalo_ocupacao_dias)::numeric) / (h.meta_intervalo_ocupacao_dias)::numeric) * 100.0), 2)
            ELSE NULL::numeric
        END AS desvio_percentual_atual,
        CASE
            WHEN ((h.meta_intervalo_ocupacao_dias IS NOT NULL) AND ((EXTRACT(epoch FROM (now() - h.data_hora_entrada)) / 86400.0) > (h.meta_intervalo_ocupacao_dias)::numeric)) THEN true
            ELSE false
        END AS meta_excedida
   FROM ((lote_modulo_historico h
     JOIN lotes l ON ((h.lote_id = l.id)))
     LEFT JOIN modulos_pastos m ON ((h.modulo_id = m.id)))
  WHERE (h.data_hora_saida IS NULL);

-- 4. Recriar v_historico_ocupacao_pasto filtrando categorias ativas
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
            WHEN (h.data_hora_saida IS NULL) THEN
            CASE
                WHEN ((p.area_util_ha IS NOT NULL) AND (p.area_util_ha > (0)::numeric)) THEN round(((COALESCE(( SELECT sum(((lc.quant_atual)::numeric * lc.peso_vivo_atual_kg_cab)) AS sum
                   FROM lote_categorias lc
                  WHERE ((lc.lote_id = h.lote_id) AND (lc.ativo = true) AND (lc.quant_atual > 0) AND (lc.peso_vivo_atual_kg_cab IS NOT NULL))), ((h.cabecas_entrada)::numeric * h.peso_vivo_medio_entrada_kg)) / 450.0) / p.area_util_ha), 2)
                ELSE NULL::numeric
            END
            ELSE h.taxa_lotacao_ua_ha
        END AS taxa_lotacao_ua_ha,
        CASE
            WHEN (h.data_hora_saida IS NOT NULL) THEN round((EXTRACT(epoch FROM (h.data_hora_saida - h.data_hora_entrada)) / 86400.0), 2)
            ELSE NULL::numeric
        END AS periodo_ocupacao_dias,
        CASE
            WHEN (h.data_hora_saida IS NOT NULL) THEN round((EXTRACT(epoch FROM (h.data_hora_saida - h.data_hora_entrada)) / 3600.0), 2)
            ELSE NULL::numeric
        END AS periodo_ocupacao_horas
   FROM (((lote_pasto_historico h
     JOIN lotes l ON ((h.lote_id = l.id)))
     LEFT JOIN pastos p ON ((h.pasto_id = p.id)))
     LEFT JOIN modulos_pastos m ON ((h.modulo_id = p.modulo_id)))
  ORDER BY h.data_hora_entrada DESC;

-- 5. Recriar v_historico_ocupacao_modulo filtrando categorias ativas
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
            WHEN (h.data_hora_saida IS NULL) THEN
            CASE
                WHEN ((m.area_util_total_ha IS NOT NULL) AND (m.area_util_total_ha > (0)::numeric)) THEN round(((( SELECT COALESCE(sum(COALESCE(( SELECT sum(((lc2.quant_atual)::numeric * lc2.peso_vivo_atual_kg_cab)) AS sum
                           FROM lote_categorias lc2
                          WHERE ((lc2.lote_id = h2.lote_id) AND (lc2.ativo = true) AND (lc2.quant_atual > 0) AND (lc2.peso_vivo_atual_kg_cab IS NOT NULL))), ((h2.cabecas_entrada)::numeric * h2.peso_vivo_medio_entrada_kg))), (0)::numeric) AS "coalesce"
                   FROM lote_modulo_historico h2
                  WHERE ((h2.modulo_id = h.modulo_id) AND (h2.data_hora_saida IS NULL))) / 450.0) / m.area_util_total_ha), 2)
                ELSE NULL::numeric
            END
            ELSE h.taxa_lotacao_ua_ha
        END AS taxa_lotacao_ua_ha,
        CASE
            WHEN (h.data_hora_saida IS NOT NULL) THEN round((EXTRACT(epoch FROM (h.data_hora_saida - h.data_hora_entrada)) / 86400.0), 2)
            ELSE NULL::numeric
        END AS periodo_ocupacao_dias,
        CASE
            WHEN (h.data_hora_saida IS NOT NULL) THEN round((EXTRACT(epoch FROM (h.data_hora_saida - h.data_hora_entrada)) / 3600.0), 2)
            ELSE NULL::numeric
        END AS periodo_ocupacao_horas
   FROM ((lote_modulo_historico h
     JOIN lotes l ON ((h.lote_id = l.id)))
     LEFT JOIN modulos_pastos m ON ((h.modulo_id = m.id)))
  ORDER BY h.data_hora_entrada DESC;;
