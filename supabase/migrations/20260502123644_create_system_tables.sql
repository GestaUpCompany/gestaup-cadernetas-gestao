-- Tabela de fila de sincronização
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacao TEXT NOT NULL,
  prioridade TEXT DEFAULT 'normal',
  retry_count INTEGER DEFAULT 0,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processado_at TIMESTAMPTZ
);

-- Índices para sync_queue
CREATE INDEX idx_sync_queue_fazenda ON sync_queue(fazenda_id);
CREATE INDEX idx_sync_queue_dispositivo ON sync_queue(dispositivo_id);
CREATE INDEX idx_sync_queue_prioridade ON sync_queue(prioridade);
CREATE INDEX idx_sync_queue_created ON sync_queue(created_at);

-- Tabela de conflitos
CREATE TABLE conflictos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  versao_local INTEGER,
  versao_remota INTEGER,
  dados_local JSONB,
  dados_remoto JSONB,
  resolvido_por TEXT,
  resolvido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para conflictos
CREATE INDEX idx_conflictos_fazenda ON conflictos(fazenda_id);
CREATE INDEX idx_conflictos_tabela ON conflictos(tabela);
CREATE INDEX idx_conflictos_resolvido ON conflictos(resolvido_por) WHERE resolvido_por IS NULL;

-- Tabela de audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela TEXT,
  registro_id UUID,
  dados_antigos JSONB,
  dados_novos JSONB,
  ip TEXT,
  user_agent TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_log
CREATE INDEX idx_audit_log_fazenda ON audit_log(fazenda_id);
CREATE INDEX idx_audit_log_dispositivo ON audit_log(dispositivo_id);
CREATE INDEX idx_audit_log_acao ON audit_log(acao);
CREATE INDEX idx_audit_log_criado_em ON audit_log(criado_em);;
