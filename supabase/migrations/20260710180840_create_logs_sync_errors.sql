-- ============================================
-- TABELA DE LOGS DE FALHAS DE SINCRONIZAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS logs_sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  caderneta TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  error_details TEXT,
  payload JSONB,
  retry_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para logs_sync_errors
CREATE INDEX IF NOT EXISTS idx_logs_sync_errors_fazenda ON logs_sync_errors(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_logs_sync_errors_caderneta ON logs_sync_errors(caderneta);
CREATE INDEX IF NOT EXISTS idx_logs_sync_errors_registro ON logs_sync_errors(registro_id);
CREATE INDEX IF NOT EXISTS idx_logs_sync_errors_created_at ON logs_sync_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_sync_errors_unresolved ON logs_sync_errors(fazenda_id) WHERE resolved_at IS NULL;

-- Habilitar RLS
ALTER TABLE logs_sync_errors ENABLE ROW LEVEL SECURITY;

-- Política: app pode inserir logs (necessário para logar falhas de autenticação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'App can insert sync error logs' AND tablename = 'logs_sync_errors'
  ) THEN
    CREATE POLICY "App can insert sync error logs"
    ON logs_sync_errors
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END
$$;

-- Política: apenas usuários da fazenda podem visualizar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their farm sync error logs' AND tablename = 'logs_sync_errors'
  ) THEN
    CREATE POLICY "Users can view their farm sync error logs"
    ON logs_sync_errors
    FOR SELECT
    TO authenticated
    USING (fazenda_id IN (
      SELECT uf.fazenda_id
      FROM usuario_fazenda uf
      JOIN usuarios u ON u.id = uf.usuario_id
      WHERE u.auth_id = auth.uid() AND uf.ativo = true
    ));
  END IF;
END
$$;;
