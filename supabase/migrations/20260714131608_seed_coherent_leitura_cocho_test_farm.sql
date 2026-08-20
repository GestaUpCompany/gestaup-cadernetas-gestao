-- Soft-delete registros atuais de leitura de cocho da fazenda de teste
UPDATE public.registros_leitura_cocho
SET deleted_at = NOW()
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
  AND deleted_at IS NULL;

-- Inserir registros de leitura de cocho coerentes
INSERT INTO public.registros_leitura_cocho (
  fazenda_id, data, responsavel, pasto_curral, pasto_id, lote, lote_id, leitura_cocho, observacao, sync_status, version
) VALUES
-- L1 - Curral 1 / Lavoura 1
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-13 12:00:00+00', 'Welton Cabral', 'Lavoura 1', NULL, 'L1', 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 1, '', 'synced', 1),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-11 12:00:00+00', 'Welton Cabral', 'Lavoura 1', NULL, 'L1', 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 2, '', 'synced', 1),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-09 12:00:00+00', 'Welton Cabral', 'Lavoura 1', NULL, 'L1', 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 1, '', 'synced', 1),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-07 12:00:00+00', 'Welton Cabral', 'Lavoura 1', NULL, 'L1', 'd3596b7b-733f-4007-a1ba-af24e25dfe66', 0, '', 'synced', 1),

-- L2 - Curral 2 / P30
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-13 12:00:00+00', 'Victor Hugo', 'P30', NULL, 'L2', 'aab9eab6-a56f-4e7c-85be-4829999fb347', 1, '', 'synced', 1),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-11 12:00:00+00', 'Victor Hugo', 'P30', NULL, 'L2', 'aab9eab6-a56f-4e7c-85be-4829999fb347', 0, '', 'synced', 1),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-09 12:00:00+00', 'Victor Hugo', 'P30', NULL, 'L2', 'aab9eab6-a56f-4e7c-85be-4829999fb347', 1, '', 'synced', 1),

-- L3 - Curral 3 / P50
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-13 12:00:00+00', 'Victor Hugo', 'P50', NULL, 'L3', '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', 2, '', 'synced', 1),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-11 12:00:00+00', 'Victor Hugo', 'P50', NULL, 'L3', '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', 1, '', 'synced', 1),
('d649c65e-16ab-4b77-a84b-df937aa41cc3', '2026-07-09 12:00:00+00', 'Victor Hugo', 'P50', NULL, 'L3', '5025c36d-066a-4d8c-9fb3-aa0f96e6da20', 1, '', 'synced', 1);;
