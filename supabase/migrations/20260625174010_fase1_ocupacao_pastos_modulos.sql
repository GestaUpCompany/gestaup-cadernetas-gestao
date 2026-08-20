
-- Fase 1: Estrutura de dados para ocupação de pastos e módulos
-- Backup realizado em: backup_fase1_lote_pasto_historico.sql
-- Alterações seguras: apenas adição de colunas e tabela nova

-- 1. Adicionar meta de ocupação em pastos
ALTER TABLE public.pastos
  ADD COLUMN IF NOT EXISTS meta_intervalo_ocupacao_dias integer;

-- 2. Adicionar meta de ocupação em módulos
ALTER TABLE public.modulos_pastos
  ADD COLUMN IF NOT EXISTS meta_intervalo_ocupacao_dias integer;

-- 3. Adicionar módulo atual em lotes
ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS modulo_id uuid REFERENCES public.modulos_pastos(id);

-- 4. Expandir lote_pasto_historico
ALTER TABLE public.lote_pasto_historico
  ADD COLUMN IF NOT EXISTS data_hora_entrada timestamp with time zone,
  ADD COLUMN IF NOT EXISTS data_hora_saida timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cabecas_entrada integer,
  ADD COLUMN IF NOT EXISTS peso_vivo_medio_entrada_kg numeric,
  ADD COLUMN IF NOT EXISTS cabecas_saida integer,
  ADD COLUMN IF NOT EXISTS peso_vivo_medio_saida_kg numeric,
  ADD COLUMN IF NOT EXISTS modulo_id uuid REFERENCES public.modulos_pastos(id),
  ADD COLUMN IF NOT EXISTS meta_intervalo_ocupacao_dias integer,
  ADD COLUMN IF NOT EXISTS desvio_tempo_ocupacao_percent numeric;

-- 5. Migrar dados: data_inicial -> data_hora_entrada, data_final -> data_hora_saida
UPDATE public.lote_pasto_historico
SET data_hora_entrada = data_inicial::timestamp with time zone,
    data_hora_saida = data_final::timestamp with time zone;

-- 6. Preencher modulo_id em lote_pasto_historico a partir de pastos.modulo_id
UPDATE public.lote_pasto_historico h
SET modulo_id = p.modulo_id
FROM public.pastos p
WHERE h.pasto_id = p.id;

-- 7. Preencher meta_intervalo_ocupacao_dias em lote_pasto_historico a partir de pastos
UPDATE public.lote_pasto_historico h
SET meta_intervalo_ocupacao_dias = p.meta_intervalo_ocupacao_dias
FROM public.pastos p
WHERE h.pasto_id = p.id;

-- 8. Criar tabela lote_modulo_historico
CREATE TABLE IF NOT EXISTS public.lote_modulo_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid REFERENCES public.lotes(id),
  modulo_id uuid REFERENCES public.modulos_pastos(id),
  data_hora_entrada timestamp with time zone DEFAULT now(),
  data_hora_saida timestamp with time zone,
  cabecas_entrada integer,
  peso_vivo_medio_entrada_kg numeric,
  cabecas_saida integer,
  peso_vivo_medio_saida_kg numeric,
  meta_intervalo_ocupacao_dias integer,
  desvio_tempo_ocupacao_percent numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_lote_pasto_historico_lote_ativo
  ON public.lote_pasto_historico(lote_id)
  WHERE data_hora_saida IS NULL;

CREATE INDEX IF NOT EXISTS idx_lote_pasto_historico_pasto_data
  ON public.lote_pasto_historico(pasto_id, data_hora_entrada DESC);

CREATE INDEX IF NOT EXISTS idx_lote_modulo_historico_lote_ativo
  ON public.lote_modulo_historico(lote_id)
  WHERE data_hora_saida IS NULL;

CREATE INDEX IF NOT EXISTS idx_lote_modulo_historico_modulo_data
  ON public.lote_modulo_historico(modulo_id, data_hora_entrada DESC);

-- 10. Atualizar modulo_id em lotes baseado no pasto atual
UPDATE public.lotes l
SET modulo_id = p.modulo_id
FROM public.pastos p
WHERE l.pasto_id = p.id;
;
