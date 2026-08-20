DELETE FROM registros_suplementacao
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND tratador = 'Teste Trigger Pos-Recalc';

-- Zerar o consumo do registro que o trigger calculou para ele (volta a ser ultimo)
UPDATE registros_suplementacao
SET 
  consumo_medio_geral_kg_mn = NULL,
  consumo_medio_30dias_kg_mn = NULL,
  consumo_medio_geral_kg_ms = NULL,
  consumo_medio_30dias_kg_ms = NULL,
  consumo_medio_geral_percent_pv = NULL,
  consumo_medio_30dias_percent_pv = NULL,
  custo_medio_reais_cab_dia = NULL,
  updated_at = NOW()
WHERE id = 'eb55f79f-d08e-4c6b-bfbf-45f5e9f1c5d0';;
