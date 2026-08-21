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
  ADD COLUMN IF NOT EXISTS impersonated_by uuid;

-- Migrar dados das colunas antigas para as novas (se houver dados no futuro)
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

-- RLS: habilitar (pode já estar habilitada)
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

-- ============================================================
-- Função genérica de auditoria
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_usuario_id uuid := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
  v_usuario_email text := NULLIF(current_setting('app.current_user_email', true), '');
  v_usuario_nome text := NULLIF(current_setting('app.current_user_nome', true), '');
  v_fazenda_id uuid := NULL;
  v_is_impersonation boolean := COALESCE(NULLIF(current_setting('app.is_impersonation', true), '')::boolean, false);
  v_impersonated_by uuid := NULLIF(current_setting('app.impersonated_by', true), '')::uuid;
  v_registro_id text;
  v_alteracoes jsonb := '{}'::jsonb;
  v_col text;
  v_old_json jsonb;
  v_new_json jsonb;
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

  -- Extrair ID do registro
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_registro_id := OLD.id::text;
    ELSE
      v_registro_id := NEW.id::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_registro_id := NULL;
  END;

  -- Calcular alterações (apenas para UPDATE)
  IF TG_OP = 'UPDATE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);
    FOR v_col IN SELECT jsonb_object_keys(v_new_json) LOOP
      IF v_old_json ->> v_col IS DISTINCT FROM v_new_json ->> v_col THEN
        v_alteracoes := v_alteracoes || jsonb_build_object(v_col, jsonb_build_array(
          v_old_json -> v_col,
          v_new_json -> v_col
        ));
      END IF;
    END LOOP;
    -- Se não houver alterações reais, não registrar
    IF v_alteracoes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Inserir na auditoria
  INSERT INTO public.audit_log (
    usuario_id, usuario_email, usuario_nome,
    fazenda_id, tabela, operacao, registro_id,
    valor_anterior, valor_novo, alteracoes,
    is_impersonation, impersonated_by,
    acao, dados_antigos, dados_novos, criado_em
  ) VALUES (
    v_usuario_id, v_usuario_email, v_usuario_nome,
    v_fazenda_id, TG_TABLE_NAME, TG_OP, v_registro_id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    CASE WHEN TG_OP = 'UPDATE' THEN v_alteracoes ELSE NULL END,
    v_is_impersonation, v_impersonated_by,
    TG_OP,  -- manter compatibilidade com coluna antiga
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
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();;
