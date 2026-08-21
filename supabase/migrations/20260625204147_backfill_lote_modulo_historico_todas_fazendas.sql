
INSERT INTO public.lote_modulo_historico (
  lote_id,
  modulo_id,
  data_hora_entrada,
  cabecas_entrada,
  peso_vivo_medio_entrada_kg,
  meta_intervalo_ocupacao_dias,
  taxa_lotacao_ua_ha,
  created_at,
  updated_at
)
SELECT DISTINCT
  h.lote_id,
  p.modulo_id,
  h.data_hora_entrada,
  h.cabecas_entrada,
  h.peso_vivo_medio_entrada_kg,
  h.meta_intervalo_ocupacao_dias,
  h.taxa_lotacao_ua_ha,
  now(),
  now()
FROM public.lote_pasto_historico h
JOIN public.pastos p ON p.id = h.pasto_id
WHERE h.data_hora_saida IS NULL
  AND p.modulo_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.lote_modulo_historico m
    WHERE m.lote_id = h.lote_id
      AND m.modulo_id = p.modulo_id
      AND m.data_hora_saida IS NULL
  )
ON CONFLICT DO NOTHING;
;
