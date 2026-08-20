-- Correção dos passivos gerados pelo bug de fuso do cron update-peso-vivo-daily.
-- O cron rodava às 00:00 UTC (20:00-04 do dia anterior), fazendo CURRENT_DATE
-- ser um dia atrás dentro de update_dados_lotes(). Isso causou:
-- 1. peso_inicio_kg_cab dos planos novos migrados com 1 GMD a menos
-- 2. snapshots de saída com gmd_realizado e ganho_peso_total_kg_cab subdimensionados
-- 3. registros_suplementacao históricos com peso_vivo_kg travado no peso do plano novo
--
-- Esta migration documenta a correção aplicada diretamente no banco em 2026-08-24.
-- Os comandos abaixo são idempotentes: só atualizam se a diferença ainda existir.

-- Item 1: Corrigir peso_inicio_kg_cab dos 17 planos novos migrados
-- Soma 1 GMD do plano antigo ao peso_inicio do plano novo
WITH correcoes AS (
  SELECT pn_new.id AS plano_novo_id, COALESCE(pn_old.gmd_planejado, f_old.gmd) AS gmd_antigo
  FROM planos_nutricionais pn_old
  JOIN planos_nutricionais_snapshots pns ON pns.plano_anterior_id = pn_old.id AND pns.tipo_snapshot = 'saida'
  JOIN planos_nutricionais pn_new ON pn_new.lote_categoria_id = pn_old.lote_categoria_id
    AND pn_new.data_inicio = pn_old.data_fim AND pn_new.ativo = true AND pn_new.id != pn_old.id
  JOIN formulacoes f_old ON f_old.id = pn_old.formulacao_id
  WHERE pn_old.data_fim IS NOT NULL
    AND (pn_old.data_fim::date - pn_old.data_inicio::date) > 0
    AND COALESCE(pn_old.gmd_planejado, f_old.gmd) IS NOT NULL
    AND pn_new.peso_inicio_kg_cab IS NOT NULL
)
UPDATE planos_nutricionais pn
SET peso_inicio_kg_cab = pn.peso_inicio_kg_cab + c.gmd_antigo,
    updated_at = now()
FROM correcoes c
WHERE pn.id = c.plano_novo_id;

-- Item 2: Recalcular snapshots de saída
-- ganho_peso_total = peso_final_correto - peso_inicio_antigo
-- gmd_realizado = ganho_peso_total / duracao_dias
WITH correcoes AS (
  SELECT pns.id AS snapshot_id,
         pn_old.peso_inicio_kg_cab + COALESCE(pn_old.gmd_planejado, f_old.gmd) * pns.duracao_dias AS peso_final_correto,
         pns.duracao_dias,
         pn_old.peso_inicio_kg_cab AS peso_inicio_antigo
  FROM planos_nutricionais_snapshots pns
  JOIN planos_nutricionais pn_old ON pn_old.id = pns.plano_anterior_id
  JOIN formulacoes f_old ON f_old.id = pn_old.formulacao_id
  WHERE pns.tipo_snapshot = 'saida'
    AND pn_old.data_fim IS NOT NULL
    AND pns.duracao_dias IS NOT NULL AND pns.duracao_dias > 0
    AND pn_old.peso_inicio_kg_cab IS NOT NULL
    AND COALESCE(pn_old.gmd_planejado, f_old.gmd) IS NOT NULL
)
UPDATE planos_nutricionais_snapshots pns
SET ganho_peso_total_kg_cab = c.peso_final_correto - c.peso_inicio_antigo,
    gmd_realizado = (c.peso_final_correto - c.peso_inicio_antigo) / c.duracao_dias
FROM correcoes c
WHERE pns.id = c.snapshot_id;

-- Item 3: Recalcular registros_suplementacao históricos
-- Executado via recalcular_pesos_suplementacao_historico() por lote,
-- mais correção manual para registros anteriores ao primeiro plano
-- (peso = peso_entrada_kg_cab) e para lote multicategoria (média ponderada).
-- Ver backups/backup_pesos_inicio_planos_fuso_cron_20260824.json para detalhes.

-- Atualizar pesos atuais dos lotes com os novos pesos_inicio
SELECT update_dados_lotes();
