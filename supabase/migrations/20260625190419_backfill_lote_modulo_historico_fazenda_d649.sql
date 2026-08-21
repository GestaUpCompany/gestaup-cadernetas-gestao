
-- Backfill de lote_modulo_historico para lotes ativos nos módulos da fazenda d649c65e
-- Usa data_hora_entrada do lote_pasto_historico (mais precisa disponível)
-- Usa cabecas e peso atuais de lote_categorias (melhor aproximação de entrada disponível)
-- O trigger de proteção de UPDATE está ativo, mas o INSERT é livre

INSERT INTO public.lote_modulo_historico (
  lote_id,
  modulo_id,
  data_hora_entrada,
  cabecas_entrada,
  peso_vivo_medio_entrada_kg,
  meta_intervalo_ocupacao_dias
)
VALUES
  -- L1 no Módulo 1 (Lavoura 1) — entrada 2026-06-23
  (
    'd3596b7b-733f-4007-a1ba-af24e25dfe66',
    '2adc5635-fe70-4117-aedb-4a17d7fa4719',
    '2026-06-23 00:00:00+00',
    193,
    397.08,
    NULL
  ),
  -- L2 no Módulo 2 (P10) — entrada 2026-06-25
  (
    'aab9eab6-a56f-4e7c-85be-4829999fb347',
    'db632af8-c078-49c8-ab0e-76d8a38a46da',
    '2026-06-25 00:00:00+00',
    106,
    548.60,
    NULL
  ),
  -- L3 no Módulo 2 (P20) — entrada 2026-06-25
  (
    '5025c36d-066a-4d8c-9fb3-aa0f96e6da20',
    'db632af8-c078-49c8-ab0e-76d8a38a46da',
    '2026-06-25 00:00:00+00',
    102,
    460.10,
    NULL
  );
;
