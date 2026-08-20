
-- Adicionar taxa_lotacao_ua_ha nos históricos de pasto e módulo
ALTER TABLE public.lote_pasto_historico
  ADD COLUMN IF NOT EXISTS taxa_lotacao_ua_ha numeric;

ALTER TABLE public.lote_modulo_historico
  ADD COLUMN IF NOT EXISTS taxa_lotacao_ua_ha numeric;
;
