-- ============================================================
-- Migration: Auditoria global
-- Tabela audit_log estendida + triggers em tabelas sensíveis
-- ============================================================

-- Adicionar colunas faltantes na audit_log existente
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS usuario_id uuid,
  ADD COLUMN IF NOT EXISTS usuario_email text,
  ADD COLUMN IF NOT EXISTS usuario_nome text,
  ADD COLUMN IF NOT EXISTS operacao text,
  ADD COLUMN IF NOT EXISTS valor_anterior jsonb,
  ADD COLUMN IF NOT EXISTS valor_novo jsonb,
  ADD COLUMN IF NOT EXISTS alteracoes jsonb,
  ADD COLUMN IF NOT EXISTS is_impersonation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS impersonated_by uuid,
  -- Colunas de granularidade
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS source_app text,
  ADD COLUMN IF NOT EXISTS transaction_id bigint,
  ADD COLUMN IF NOT EXISTS is_soft_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS origin_page text;

-- Migrar dados das colunas antigas para as novas (se houver dados)
UPDATE public.audit_log SET
  operacao = acao,
  valor_anterior = dados_antigos::jsonb,
  valor_novo = dados_novos::jsonb
WHERE operacao IS NULL AND acao IS NOT NULL;

-- Adicionar constraint de operacao
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_operacao_check;
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_operacao_check CHECK (operacao IN ('INSERT','UPDATE','DELETE'));

-- Tornar fazenda_id e registro_id nullable (usuarios e fazendas não têm fazenda_id)
ALTER TABLE public.audit_log ALTER COLUMN fazenda_id DROP NOT NULL;
ALTER TABLE public.audit_log ALTER COLUMN registro_id DROP NOT NULL;

-- RLS: habilitar
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated pode ler (filtragem por fazenda fica no app)
DROP POLICY IF EXISTS rls_audit_log_select ON public.audit_log;
CREATE POLICY rls_audit_log_select ON public.audit_log
  FOR SELECT TO authenticated USING (true);

-- Apenas triggers/service_role podem inserir
DROP POLICY IF EXISTS rls_audit_log_insert ON public.audit_log;
CREATE POLICY rls_audit_log_insert ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (false);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_log_criado_em ON public.audit_log (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_fazenda_id ON public.audit_log (fazenda_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_id ON public.audit_log (usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela ON public.audit_log (tabela);
CREATE INDEX IF NOT EXISTS idx_audit_log_operacao ON public.audit_log (operacao);
CREATE INDEX IF NOT EXISTS idx_audit_log_transaction_id ON public.audit_log (transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_is_soft_delete ON public.audit_log (is_soft_delete) WHERE is_soft_delete = true;
CREATE INDEX IF NOT EXISTS idx_audit_log_source_app ON public.audit_log (source_app) WHERE source_app IS NOT NULL;

-- ============================================================
-- Função genérica de auditoria
-- Usada como trigger AFTER em tabelas sensíveis
-- Lê variáveis de sessão setadas por set_audit_context()
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id_text text := NULLIF(current_setting('app.current_user_id', true), '');
  v_usuario_id uuid := v_user_id_text::uuid;
  v_usuario_email text := NULLIF(current_setting('app.current_user_email', true), '');
  v_usuario_nome text := NULLIF(current_setting('app.current_user_nome', true), '');
  v_fazenda_id uuid := NULL;
  v_is_impersonation boolean := COALESCE(NULLIF(current_setting('app.is_impersonation', true), '')::boolean, false);
  v_imp_by_text text := NULLIF(current_setting('app.impersonated_by', true), '');
  v_impersonated_by uuid := v_imp_by_text::uuid;
  v_ip_address text := NULLIF(current_setting('app.ip_address', true), '');
  v_user_agent text := NULLIF(current_setting('app.user_agent', true), '');
  v_source_app text := NULLIF(current_setting('app.source_app', true), '');
  v_origin_page text := NULLIF(current_setting('app.origin_page', true), '');
  v_registro_id uuid := NULL;
  v_alteracoes jsonb := '{}'::jsonb;
  v_col text;
  v_old_json jsonb;
  v_new_json jsonb;
  -- Colunas que não tem valor de auditoria (mudam automaticamente)
  v_noise_cols text[] := ARRAY['ultimo_acesso', 'updated_at', 'created_at'];
  v_is_soft_delete boolean := false;
  v_old_ativo boolean;
  v_new_ativo boolean;
BEGIN
  -- Extrair fazenda_id do registro se a coluna existir
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_fazenda_id := OLD.fazenda_id;
    ELSE
      v_fazenda_id := NEW.fazenda_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fazenda_id := NULL;
  END;

  -- Extrair ID do registro (uuid)
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_registro_id := OLD.id;
    ELSE
      v_registro_id := NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_registro_id := NULL;
  END;

  -- Calcular alterações (apenas para UPDATE)
  IF TG_OP = 'UPDATE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);
    FOR v_col IN SELECT jsonb_object_keys(v_new_json) LOOP
      -- Ignorar colunas de ruído
      IF v_col = ANY(v_noise_cols) THEN
        CONTINUE;
      END IF;
      IF v_old_json ->> v_col IS DISTINCT FROM v_new_json ->> v_col THEN
        v_alteracoes := v_alteracoes || jsonb_build_object(v_col, jsonb_build_array(
          v_old_json -> v_col,
          v_new_json -> v_col
        ));
      END IF;
    END LOOP;
    -- Se não houver alterações reais (ignorando ruído), não registrar
    IF v_alteracoes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

    -- Detectar soft delete: campo 'ativo' mudou de true para false
    BEGIN
      v_old_ativo := (v_old_json ->> 'ativo')::boolean;
      v_new_ativo := (v_new_json ->> 'ativo')::boolean;
      IF v_old_ativo = true AND v_new_ativo = false THEN
        v_is_soft_delete := true;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_is_soft_delete := false;
    END;
  END IF;

  -- Inserir na auditoria
  INSERT INTO public.audit_log (
    usuario_id, usuario_email, usuario_nome,
    fazenda_id, tabela, operacao, registro_id,
    valor_anterior, valor_novo, alteracoes,
    is_impersonation, impersonated_by,
    ip_address, user_agent, source_app, origin_page,
    transaction_id, is_soft_delete,
    acao, dados_antigos, dados_novos, criado_em
  ) VALUES (
    v_usuario_id, v_usuario_email, v_usuario_nome,
    v_fazenda_id, TG_TABLE_NAME, TG_OP, v_registro_id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    CASE WHEN TG_OP = 'UPDATE' THEN v_alteracoes ELSE NULL END,
    v_is_impersonation, v_impersonated_by,
    NULLIF(v_ip_address, ''), NULLIF(v_user_agent, ''), NULLIF(v_source_app, ''), NULLIF(v_origin_page, ''),
    txid_current(), v_is_soft_delete,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================
-- Aplicar triggers nas tabelas sensíveis
-- ============================================================

-- lotes
DROP TRIGGER IF EXISTS trg_audit_lotes ON public.lotes;
CREATE TRIGGER trg_audit_lotes
  AFTER INSERT OR UPDATE OR DELETE ON public.lotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- individuos
DROP TRIGGER IF EXISTS trg_audit_individuos ON public.individuos;
CREATE TRIGGER trg_audit_individuos
  AFTER INSERT OR UPDATE OR DELETE ON public.individuos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_suplementacao
DROP TRIGGER IF EXISTS trg_audit_registros_suplementacao ON public.registros_suplementacao;
CREATE TRIGGER trg_audit_registros_suplementacao
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_suplementacao
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_maternidade
DROP TRIGGER IF EXISTS trg_audit_registros_maternidade ON public.registros_maternidade;
CREATE TRIGGER trg_audit_registros_maternidade
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_maternidade
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_enfermaria
DROP TRIGGER IF EXISTS trg_audit_registros_enfermaria ON public.registros_enfermaria;
CREATE TRIGGER trg_audit_registros_enfermaria
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_enfermaria
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- planos_nutricionais
DROP TRIGGER IF EXISTS trg_audit_planos_nutricionais ON public.planos_nutricionais;
CREATE TRIGGER trg_audit_planos_nutricionais
  AFTER INSERT OR UPDATE OR DELETE ON public.planos_nutricionais
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- fazendas
DROP TRIGGER IF EXISTS trg_audit_fazendas ON public.fazendas;
CREATE TRIGGER trg_audit_fazendas
  AFTER INSERT OR UPDATE OR DELETE ON public.fazendas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- usuarios
DROP TRIGGER IF EXISTS trg_audit_usuarios ON public.usuarios;
CREATE TRIGGER trg_audit_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- lote_categorias
DROP TRIGGER IF EXISTS trg_audit_lote_categorias ON public.lote_categorias;
CREATE TRIGGER trg_audit_lote_categorias
  AFTER INSERT OR UPDATE OR DELETE ON public.lote_categorias
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_movimentacao
DROP TRIGGER IF EXISTS trg_audit_registros_movimentacao ON public.registros_movimentacao;
CREATE TRIGGER trg_audit_registros_movimentacao
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_movimentacao
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ============================================================
-- Triggers adicionais (tabelas críticas)
-- ============================================================

-- registros_morte
DROP TRIGGER IF EXISTS trg_audit_registros_morte ON public.registros_morte;
CREATE TRIGGER trg_audit_registros_morte
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_morte
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- formulacoes
DROP TRIGGER IF EXISTS trg_audit_formulacoes ON public.formulacoes;
CREATE TRIGGER trg_audit_formulacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.formulacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- usuario_fazenda
DROP TRIGGER IF EXISTS trg_audit_usuario_fazenda ON public.usuario_fazenda;
CREATE TRIGGER trg_audit_usuario_fazenda
  AFTER INSERT OR UPDATE OR DELETE ON public.usuario_fazenda
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- currais
DROP TRIGGER IF EXISTS trg_audit_currais ON public.currais;
CREATE TRIGGER trg_audit_currais
  AFTER INSERT OR UPDATE OR DELETE ON public.currais
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- pastos
DROP TRIGGER IF EXISTS trg_audit_pastos ON public.pastos;
CREATE TRIGGER trg_audit_pastos
  AFTER INSERT OR UPDATE OR DELETE ON public.pastos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_leitura_cocho
DROP TRIGGER IF EXISTS trg_audit_registros_leitura_cocho ON public.registros_leitura_cocho;
CREATE TRIGGER trg_audit_registros_leitura_cocho
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_leitura_cocho
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_alimentacao
DROP TRIGGER IF EXISTS trg_audit_registros_alimentacao ON public.registros_alimentacao;
CREATE TRIGGER trg_audit_registros_alimentacao
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_alimentacao
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- programacao_tratos
DROP TRIGGER IF EXISTS trg_audit_programacao_tratos ON public.programacao_tratos;
CREATE TRIGGER trg_audit_programacao_tratos
  AFTER INSERT OR UPDATE OR DELETE ON public.programacao_tratos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- funcionarios
DROP TRIGGER IF EXISTS trg_audit_funcionarios ON public.funcionarios;
CREATE TRIGGER trg_audit_funcionarios
  AFTER INSERT OR UPDATE OR DELETE ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- tratamentos
DROP TRIGGER IF EXISTS trg_audit_tratamentos ON public.tratamentos;
CREATE TRIGGER trg_audit_tratamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.tratamentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- registros_abastecimento
DROP TRIGGER IF EXISTS trg_audit_registros_abastecimento ON public.registros_abastecimento;
CREATE TRIGGER trg_audit_registros_abastecimento
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_abastecimento
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- ============================================================
-- RPC para consultar auditoria com filtros
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_audit_log(
  p_fazenda_id uuid DEFAULT NULL,
  p_usuario_id uuid DEFAULT NULL,
  p_tabela text DEFAULT NULL,
  p_operacao text DEFAULT NULL,
  p_data_inicio timestamptz DEFAULT NULL,
  p_data_fim timestamptz DEFAULT NULL,
  p_limite int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'entries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'createdAt', a.criado_em,
        'usuarioId', a.usuario_id,
        'usuarioEmail', a.usuario_email,
        'usuarioNome', a.usuario_nome,
        'fazendaId', a.fazenda_id,
        'fazendaNome', f.nome,
        'tabela', a.tabela,
        'operacao', a.operacao,
        'registroId', a.registro_id,
        'valorAnterior', a.valor_anterior,
        'valorNovo', a.valor_novo,
        'alteracoes', a.alteracoes,
        'isImpersonation', a.is_impersonation,
        'impersonatedBy', a.impersonated_by,
        'ipAddress', a.ip_address,
        'userAgent', a.user_agent,
        'sourceApp', a.source_app,
        'originPage', a.origin_page,
        'transactionId', a.transaction_id,
        'isSoftDelete', a.is_soft_delete,
        'batchSize', (
          SELECT COUNT(*) FROM public.audit_log b
          WHERE b.transaction_id = a.transaction_id
            AND b.transaction_id IS NOT NULL
        )
      ) ORDER BY a.criado_em DESC)
      FROM public.audit_log a
      LEFT JOIN public.fazendas f ON f.id = a.fazenda_id
      WHERE (p_fazenda_id IS NULL OR a.fazenda_id = p_fazenda_id)
        AND (p_usuario_id IS NULL OR a.usuario_id = p_usuario_id)
        AND (p_tabela IS NULL OR a.tabela = p_tabela)
        AND (p_operacao IS NULL OR a.operacao = p_operacao)
        AND (p_data_inicio IS NULL OR a.criado_em >= p_data_inicio)
        AND (p_data_fim IS NULL OR a.criado_em <= p_data_fim)
      LIMIT p_limite OFFSET p_offset
    ), '[]'::jsonb),
    'total', (
      SELECT COUNT(*) FROM public.audit_log a
      WHERE (p_fazenda_id IS NULL OR a.fazenda_id = p_fazenda_id)
        AND (p_usuario_id IS NULL OR a.usuario_id = p_usuario_id)
        AND (p_tabela IS NULL OR a.tabela = p_tabela)
        AND (p_operacao IS NULL OR a.operacao = p_operacao)
        AND (p_data_inicio IS NULL OR a.criado_em >= p_data_inicio)
        AND (p_data_fim IS NULL OR a.criado_em <= p_data_fim)
    ),
    'tabelasAuditadas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('tabela', tabela, 'count', cnt))
      FROM (
        SELECT tabela, COUNT(*) as cnt FROM public.audit_log
        GROUP BY tabela ORDER BY cnt DESC
      ) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_audit_log(uuid, uuid, text, text, timestamptz, timestamptz, int, int) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_log(uuid, uuid, text, text, timestamptz, timestamptz, int, int) TO authenticated;

-- ============================================================
-- RPC para setar contexto de auditoria na sessão atual
-- Deve ser chamada pelo frontend antes de operações de escrita
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_audit_context(
  p_user_id uuid DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_user_nome text DEFAULT NULL,
  p_is_impersonation boolean DEFAULT false,
  p_impersonated_by uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_source_app text DEFAULT NULL,
  p_origin_page text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- is_local=false (session-level) persiste na conexão backend entre transações
  PERFORM set_config('app.current_user_id', COALESCE(p_user_id::text, ''), false);
  PERFORM set_config('app.current_user_email', COALESCE(p_user_email, ''), false);
  PERFORM set_config('app.current_user_nome', COALESCE(p_user_nome, ''), false);
  PERFORM set_config('app.is_impersonation', COALESCE(p_is_impersonation::text, 'false'), false);
  PERFORM set_config('app.impersonated_by', COALESCE(p_impersonated_by::text, ''), false);
  PERFORM set_config('app.ip_address', COALESCE(p_ip_address, ''), false);
  PERFORM set_config('app.user_agent', COALESCE(p_user_agent, ''), false);
  PERFORM set_config('app.source_app', COALESCE(p_source_app, ''), false);
  PERFORM set_config('app.origin_page', COALESCE(p_origin_page, ''), false);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_audit_context(uuid, text, text, boolean, uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_audit_context(uuid, text, text, boolean, uuid, text, text, text, text) TO authenticated;

-- ============================================================
-- Cron para limpeza: remover auditoria com mais de 90 dias
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_audit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.audit_log WHERE criado_em < now() - interval '90 days';
END;
$function$;

SELECT cron.schedule(
  'cleanup-audit-log',
  '0 3 * * *',
  'SELECT public.cleanup_audit_log();'
);
