-- Soft-delete registros inconsistentes da fazenda de teste
UPDATE public.registros_suplementacao
SET deleted_at = NOW()
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND deleted_at IS NULL;

-- Inserir registros de suplementacao coerentes para a fazenda de teste
INSERT INTO public.registros_suplementacao (
  fazenda_id, data, tratador, pasto, lote, formulacao, categorias, leitura,
  kg_cocho, kg_deposito, sync_status, version, lote_id, pasto_id, n_cabecas, peso_vivo_kg
) VALUES
-- L1 - Boi Magro (terminacao) - Curral 1 / Lavoura 1
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-01 12:00:00+00', 'Welton Cabral', 'Lavoura 1', 'L1', 'E/S - TIP 2,0%', 'Boi Magro', '1', 1500, 0, 'synced', 1, 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 'b6dd9bf9-6c69-44fc-94df-7454cba42c21', 120, 430),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-03 12:00:00+00', 'Welton Cabral', 'Lavoura 1', 'L1', 'E/S - TIP 2,0%', 'Boi Magro', '2', 1500, 0, 'synced', 1, 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 'b6dd9bf9-6c69-44fc-94df-7454cba42c21', 120, 430),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-05 12:00:00+00', 'Welton Cabral', 'Lavoura 1', 'L1', 'E/S - TIP 2,0%', 'Boi Magro', '1', 1500, 0, 'synced', 1, 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 'b6dd9bf9-6c69-44fc-94df-7454cba42c21', 120, 430),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-07 12:00:00+00', 'Welton Cabral', 'Lavoura 1', 'L1', 'E/S - TIP 2,0%', 'Boi Magro', '0', 1500, 0, 'synced', 1, 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 'b6dd9bf9-6c69-44fc-94df-7454cba42c21', 120, 430),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-09 12:00:00+00', 'Welton Cabral', 'Lavoura 1', 'L1', 'E/S - TIP 2,0%', 'Boi Magro', '1', 1500, 0, 'synced', 1, 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 'b6dd9bf9-6c69-44fc-94df-7454cba42c21', 120, 430),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-11 12:00:00+00', 'Welton Cabral', 'Lavoura 1', 'L1', 'E/S - TIP 2,0%', 'Boi Magro', '2', 1500, 0, 'synced', 1, 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 'b6dd9bf9-6c69-44fc-94df-7454cba42c21', 120, 430),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-13 12:00:00+00', 'Welton Cabral', 'Lavoura 1', 'L1', 'E/S - TIP 2,0%', 'Boi Magro', '1', 1500, 0, 'synced', 1, 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 'b6dd9bf9-6c69-44fc-94df-7454cba42c21', 120, 430),

-- L2 - Vaca + bezerros (cria) - Curral 2 / P30
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-01 12:00:00+00', 'Victor Hugo', 'P30', 'L2', 'R/S - Proteinado 0,3% PV', 'Vaca Parida, Bezerra ao Pé, Bezerro ao Pé', '1', 900, 0, 'synced', 1, 'aab9eab6-a56f-4e7c-85be-4829999fb347', '6b9e8fe6-9b91-4375-9dc0-721acc53c55d', 80, 400),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-03 12:00:00+00', 'Victor Hugo', 'P30', 'L2', 'R/S - Proteinado 0,3% PV', 'Vaca Parida, Bezerra ao Pé, Bezerro ao Pé', '2', 900, 0, 'synced', 1, 'aab9eab6-a56f-4e7c-85be-4829999fb347', '6b9e8fe6-9b91-4375-9dc0-721acc53c55d', 80, 400),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-05 12:00:00+00', 'Victor Hugo', 'P30', 'L2', 'R/S - Proteinado 0,3% PV', 'Vaca Parida, Bezerra ao Pé, Bezerro ao Pé', '1', 900, 0, 'synced', 1, 'aab9eab6-a56f-4e7c-85be-4829999fb347', '6b9e8fe6-9b91-4375-9dc0-721acc53c55d', 80, 400),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-07 12:00:00+00', 'Victor Hugo', 'P30', 'L2', 'R/S - Proteinado 0,3% PV', 'Vaca Parida, Bezerra ao Pé, Bezerro ao Pé', '0', 900, 0, 'synced', 1, 'aab9eab6-a56f-4e7c-85be-4829999fb347', '6b9e8fe6-9b91-4375-9dc0-721acc53c55d', 80, 400),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-09 12:00:00+00', 'Victor Hugo', 'P30', 'L2', 'R/S - Proteinado 0,3% PV', 'Vaca Parida, Bezerra ao Pé, Bezerro ao Pé', '1', 900, 0, 'synced', 1, 'aab9eab6-a56f-4e7c-85be-4829999fb347', '6b9e8fe6-9b91-4375-9dc0-721acc53c55d', 80, 400),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-11 12:00:00+00', 'Victor Hugo', 'P30', 'L2', 'R/S - Proteinado 0,3% PV', 'Vaca Parida, Bezerra ao Pé, Bezerro ao Pé', '2', 900, 0, 'synced', 1, 'aab9eab6-a56f-4e7c-85be-4829999fb347', '6b9e8fe6-9b91-4375-9dc0-721acc53c55d', 80, 400),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-13 12:00:00+00', 'Victor Hugo', 'P30', 'L2', 'R/S - Proteinado 0,3% PV', 'Vaca Parida, Bezerra ao Pé, Bezerro ao Pé', '1', 900, 0, 'synced', 1, 'aab9eab6-a56f-4e7c-85be-4829999fb347', '6b9e8fe6-9b91-4375-9dc0-721acc53c55d', 80, 400),

-- L3 - Novilho / Touro (recria) - Curral 3 / P50
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-01 12:00:00+00', 'Victor Hugo', 'P50', 'L3', 'R/S - Proteinado 0,3% PV', 'Novilho, Touro', '1', 700, 0, 'synced', 1, '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', '1b40a816-3c89-4b32-aba8-47f70f7d2aed', 60, 380),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-03 12:00:00+00', 'Victor Hugo', 'P50', 'L3', 'R/S - Proteinado 0,3% PV', 'Novilho, Touro', '2', 700, 0, 'synced', 1, '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', '1b40a816-3c89-4b32-aba8-47f70f7d2aed', 60, 380),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-05 12:00:00+00', 'Victor Hugo', 'P50', 'L3', 'R/S - Proteinado 0,3% PV', 'Novilho, Touro', '1', 700, 0, 'synced', 1, '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', '1b40a816-3c89-4b32-aba8-47f70f7d2aed', 60, 380),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-07 12:00:00+00', 'Victor Hugo', 'P50', 'L3', 'R/S - Proteinado 0,3% PV', 'Novilho, Touro', '0', 700, 0, 'synced', 1, '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', '1b40a816-3c89-4b32-aba8-47f70f7d2aed', 60, 380),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-09 12:00:00+00', 'Victor Hugo', 'P50', 'L3', 'R/S - Proteinado 0,3% PV', 'Novilho, Touro', '1', 700, 0, 'synced', 1, '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', '1b40a816-3c89-4b32-aba8-47f70f7d2aed', 60, 380),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-11 12:00:00+00', 'Victor Hugo', 'P50', 'L3', 'R/S - Proteinado 0,3% PV', 'Novilho, Touro', '2', 700, 0, 'synced', 1, '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', '1b40a816-3c89-4b32-aba8-47f70f7d2aed', 60, 380),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-13 12:00:00+00', 'Victor Hugo', 'P50', 'L3', 'R/S - Proteinado 0,3% PV', 'Novilho, Touro', '1', 700, 0, 'synced', 1, '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', '1b40a816-3c89-4b32-aba8-47f70f7d2aed', 60, 380);;
