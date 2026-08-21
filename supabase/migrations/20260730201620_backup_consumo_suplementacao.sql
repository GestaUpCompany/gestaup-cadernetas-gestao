-- Backup dos dados de consumo atuais antes da correcao
CREATE TABLE IF NOT EXISTS public.backup_consumo_suplementacao_20260730 AS
SELECT 
  id,
  fazenda_id,
  lote_id,
  formulacao,
  data,
  kg_cocho,
  n_cabecas,
  qtd_bezerros,
  peso_vivo_kg,
  consumo_medio_geral_percent_pv,
  consumo_medio_30dias_percent_pv,
  consumo_medio_geral_kg_mn,
  consumo_medio_30dias_kg_mn,
  consumo_medio_geral_kg_ms,
  consumo_medio_30dias_kg_ms,
  custo_medio_reais_cab_dia,
  updated_at,
  now() AS backup_em
FROM public.registros_suplementacao
WHERE deleted_at IS NULL
  AND (
    consumo_medio_geral_kg_mn IS NOT NULL
    OR consumo_medio_geral_percent_pv IS NOT NULL
    OR consumo_medio_geral_kg_ms IS NOT NULL
    OR custo_medio_reais_cab_dia IS NOT NULL
  );

SELECT COUNT(*) AS registros_backupeados FROM public.backup_consumo_suplementacao_20260730;;
