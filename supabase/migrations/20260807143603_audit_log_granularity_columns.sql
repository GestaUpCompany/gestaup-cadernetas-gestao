-- Adicionar colunas de granularidade na audit_log
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS source_app text,
  ADD COLUMN IF NOT EXISTS transaction_id bigint,
  ADD COLUMN IF NOT EXISTS is_soft_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS origin_page text;

-- Índice para agrupar por transação
CREATE INDEX IF NOT EXISTS idx_audit_log_transaction_id ON public.audit_log (transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_is_soft_delete ON public.audit_log (is_soft_delete) WHERE is_soft_delete = true;
CREATE INDEX IF NOT EXISTS idx_audit_log_source_app ON public.audit_log (source_app) WHERE source_app IS NOT NULL;;
