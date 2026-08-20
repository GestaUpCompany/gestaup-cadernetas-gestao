-- Limpar todos os valores antigos de consumo
UPDATE registros_suplementacao
SET 
  consumo_medio_geral_percent_pv = NULL,
  consumo_medio_30dias_percent_pv = NULL,
  consumo_medio_geral_kg_mn = NULL,
  consumo_medio_30dias_kg_mn = NULL,
  consumo_medio_geral_kg_ms = NULL,
  consumo_medio_30dias_kg_ms = NULL,
  custo_medio_reais_cab_dia = NULL,
  updated_at = NOW()
WHERE deleted_at IS NULL;

SELECT COUNT(*) AS registros_limpos FROM registros_suplementacao WHERE deleted_at IS NULL AND consumo_medio_geral_kg_mn IS NULL;;
