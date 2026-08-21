
-- Fase 4 (continuação): Agendamento do job de notificações via pg_cron

-- Garantir que pg_cron está habilitado
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover job anterior se existir (ignorar erro se não existir)
DO $$
BEGIN
  PERFORM cron.unschedule('verificar_ocupacoes_acima_meta');
EXCEPTION WHEN OTHERS THEN
  -- Job não existe, ignorar
  NULL;
END $$;

-- Criar job diário para verificar ocupações acima da meta
-- Roda todos os dias às 06:00 UTC
SELECT cron.schedule(
  'verificar_ocupacoes_acima_meta',
  '0 6 * * *',
  'SELECT public.verificar_ocupacoes_acima_meta();'
);
;
