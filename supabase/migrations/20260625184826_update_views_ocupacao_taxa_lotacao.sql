
-- Dropar e recriar as views para adicionar novas colunas sem conflito de ordem
DROP VIEW IF EXISTS public.v_lote_pasto_ocupacao_atual;
DROP VIEW IF EXISTS public.v_lote_modulo_ocupacao_atual;

-- ============================================================
-- VIEW: v_lote_pasto_ocupacao_atual (com taxa de lotação)
-- ============================================================
CREATE VIEW public.v_lote_pasto_ocupacao_atual AS
SELECT
  h.id AS historico_id,
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
  -- Cabeças atuais (via lote_categorias, fallback para entrada)
  COALESCE(
    (SELECT SUM(lc.quant_atual)
     FROM public.lote_categorias lc
     WHERE lc.lote_id = h.lote_id AND lc.quant_atual > 0),
    h.cabecas_entrada
  ) AS cabecas_atual,
  -- Peso médio atual (via calcular_peso_medio_lote, fallback para entrada)
  COALESCE(
    public.calcular_peso_medio_lote(h.lote_id),
    h.peso_vivo_medio_entrada_kg
  ) AS peso_vivo_medio_atual_kg,
  -- Taxa de lotação: (cab * peso) / 450 / area_ha
  CASE
    WHEN p.area_util_ha IS NOT NULL AND p.area_util_ha > 0
    THEN round(
      COALESCE(
        (SELECT SUM(lc.quant_atual * lc.peso_vivo_atual_kg_cab)
         FROM public.lote_categorias lc
         WHERE lc.lote_id = h.lote_id AND lc.quant_atual > 0 AND lc.peso_vivo_atual_kg_cab IS NOT NULL),
        h.cabecas_entrada * h.peso_vivo_medio_entrada_kg
      ) / 450.0 / p.area_util_ha
    , 2)
    ELSE NULL
  END AS taxa_lotacao_ua_ha,
  -- Período de ocupação
  round(EXTRACT(epoch FROM now() - h.data_hora_entrada) / 86400.0, 2) AS periodo_ocupacao_dias,
  round(EXTRACT(epoch FROM now() - h.data_hora_entrada) / 3600.0,  2) AS periodo_ocupacao_horas,
  CASE
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL
    THEN GREATEST(0::numeric, round(EXTRACT(epoch FROM now() - h.data_hora_entrada) / 86400.0 - h.meta_intervalo_ocupacao_dias::numeric, 2))
    ELSE NULL
  END AS dias_acima_meta,
  CASE
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL AND h.meta_intervalo_ocupacao_dias > 0
    THEN round((EXTRACT(epoch FROM now() - h.data_hora_entrada) / 86400.0 - h.meta_intervalo_ocupacao_dias::numeric) / h.meta_intervalo_ocupacao_dias::numeric * 100.0, 2)
    ELSE NULL
  END AS desvio_percentual_atual,
  CASE
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL
      AND (EXTRACT(epoch FROM now() - h.data_hora_entrada) / 86400.0) > h.meta_intervalo_ocupacao_dias::numeric
    THEN true
    ELSE false
  END AS meta_excedida
FROM public.lote_pasto_historico h
JOIN public.lotes l ON h.lote_id = l.id
LEFT JOIN public.pastos p ON h.pasto_id = p.id
LEFT JOIN public.modulos_pastos m ON h.modulo_id = m.id
WHERE h.data_hora_saida IS NULL;

GRANT SELECT ON public.v_lote_pasto_ocupacao_atual TO authenticated, anon;


-- ============================================================
-- VIEW: v_lote_modulo_ocupacao_atual (com taxa de lotação do módulo inteiro)
-- ============================================================
CREATE VIEW public.v_lote_modulo_ocupacao_atual AS
SELECT
  h.id AS historico_id,
  h.lote_id,
  l.nome AS lote_nome,
  h.modulo_id,
  m.nome AS modulo_nome,
  h.data_hora_entrada,
  h.cabecas_entrada,
  h.peso_vivo_medio_entrada_kg,
  h.meta_intervalo_ocupacao_dias,
  -- Cabeças atuais (via lote_categorias, fallback para entrada)
  COALESCE(
    (SELECT SUM(lc.quant_atual)
     FROM public.lote_categorias lc
     WHERE lc.lote_id = h.lote_id AND lc.quant_atual > 0),
    h.cabecas_entrada
  ) AS cabecas_atual,
  -- Peso médio atual (via calcular_peso_medio_lote, fallback para entrada)
  COALESCE(
    public.calcular_peso_medio_lote(h.lote_id),
    h.peso_vivo_medio_entrada_kg
  ) AS peso_vivo_medio_atual_kg,
  -- Taxa de lotação do módulo inteiro: soma todos os lotes ativos no módulo
  CASE
    WHEN m.area_util_total_ha IS NOT NULL AND m.area_util_total_ha > 0
    THEN round(
      (
        SELECT COALESCE(
          SUM(
            COALESCE(
              (SELECT SUM(lc2.quant_atual * lc2.peso_vivo_atual_kg_cab)
               FROM public.lote_categorias lc2
               WHERE lc2.lote_id = h2.lote_id
                 AND lc2.quant_atual > 0
                 AND lc2.peso_vivo_atual_kg_cab IS NOT NULL),
              h2.cabecas_entrada * h2.peso_vivo_medio_entrada_kg
            )
          ), 0
        )
        FROM public.lote_modulo_historico h2
        WHERE h2.modulo_id = h.modulo_id AND h2.data_hora_saida IS NULL
      ) / 450.0 / m.area_util_total_ha
    , 2)
    ELSE NULL
  END AS taxa_lotacao_ua_ha,
  -- Período de ocupação
  round(EXTRACT(epoch FROM now() - h.data_hora_entrada) / 86400.0, 2) AS periodo_ocupacao_dias,
  round(EXTRACT(epoch FROM now() - h.data_hora_entrada) / 3600.0,  2) AS periodo_ocupacao_horas,
  CASE
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL
    THEN GREATEST(0::numeric, round(EXTRACT(epoch FROM now() - h.data_hora_entrada) / 86400.0 - h.meta_intervalo_ocupacao_dias::numeric, 2))
    ELSE NULL
  END AS dias_acima_meta,
  CASE
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL AND h.meta_intervalo_ocupacao_dias > 0
    THEN round((EXTRACT(epoch FROM now() - h.data_hora_entrada) / 86400.0 - h.meta_intervalo_ocupacao_dias::numeric) / h.meta_intervalo_ocupacao_dias::numeric * 100.0, 2)
    ELSE NULL
  END AS desvio_percentual_atual,
  CASE
    WHEN h.meta_intervalo_ocupacao_dias IS NOT NULL
      AND (EXTRACT(epoch FROM now() - h.data_hora_entrada) / 86400.0) > h.meta_intervalo_ocupacao_dias::numeric
    THEN true
    ELSE false
  END AS meta_excedida
FROM public.lote_modulo_historico h
JOIN public.lotes l ON h.lote_id = l.id
LEFT JOIN public.modulos_pastos m ON h.modulo_id = m.id
WHERE h.data_hora_saida IS NULL;

GRANT SELECT ON public.v_lote_modulo_ocupacao_atual TO authenticated, anon;
;
