-- Adiciona colunas de contexto de auditoria em logs_sync_errors.
-- dispositivo_uuid: UUID gerado no app (localStorage), sem FK para dispositivos,
--   porque a tabela dispositivos está vazia e o registro de dispositivo está desativado.
--   Permite correlacionar erros por aparelho sem depender de cadastro prévio.
-- app_version: versão do PWA no momento da falha (VITE_APP_VERSION ou package.json).
-- platform: 'ios' | 'android' | 'web' inferido do userAgent.
-- network_status: 'online' | 'offline' + effectiveType (ex.: 'online-4g').
ALTER TABLE public.logs_sync_errors
  ADD COLUMN IF NOT EXISTS dispositivo_uuid text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS network_status text;

CREATE INDEX IF NOT EXISTS idx_logs_sync_errors_dispositivo_uuid
  ON public.logs_sync_errors (dispositivo_uuid);
CREATE INDEX IF NOT EXISTS idx_logs_sync_errors_app_version
  ON public.logs_sync_errors (app_version);
CREATE INDEX IF NOT EXISTS idx_logs_sync_errors_platform
  ON public.logs_sync_errors (platform);;
