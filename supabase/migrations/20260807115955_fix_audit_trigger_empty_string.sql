-- Atualizar trigger para tratar string vazia (set_config retorna '' quando não setado)
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
  v_registro_id uuid := NULL;
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
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;;
