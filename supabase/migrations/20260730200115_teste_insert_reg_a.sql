-- Teste: inserir Registro A (2026-07-28)
INSERT INTO registros_suplementacao (
  fazenda_id, data, lote_id, lote, formulacao, kg_cocho, 
  n_cabecas, peso_vivo_kg, tratador, pasto
) VALUES (
  'd649c65e-16ab-4b77-a84b-df937aa41cc3',
  '2026-07-28 10:00:00+00',
  'd3596b7b-733f-4007-a1ba-af24e25dfe66',
  'L1',
  'Boi Magro 2',
  500.00,
  100,
  400.00,
  'Teste Trigger',
  'Pasto Teste'
)
RETURNING id, data, kg_cocho, n_cabecas, peso_vivo_kg, 
  consumo_medio_geral_kg_mn, consumo_medio_geral_percent_pv;;
