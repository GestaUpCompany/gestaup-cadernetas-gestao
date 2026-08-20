ALTER TABLE public.planos_nutricionais_snapshots
ADD COLUMN IF NOT EXISTS tipo_snapshot text NOT NULL DEFAULT 'saida'
CHECK (tipo_snapshot IN ('entrada', 'saida'));

COMMENT ON COLUMN public.planos_nutricionais_snapshots.tipo_snapshot IS 'entrada = estado do lote ao iniciar o plano; saida = estado ao encerrar/migrar';

-- Atualizar snapshots existentes como 'saida'
UPDATE public.planos_nutricionais_snapshots SET tipo_snapshot = 'saida' WHERE tipo_snapshot IS NULL OR tipo_snapshot = 'saida';

CREATE INDEX IF NOT EXISTS idx_planos_snapshots_tipo
  ON public.planos_nutricionais_snapshots(plano_nutricional_id, tipo_snapshot);;
