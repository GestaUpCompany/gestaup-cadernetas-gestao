-- RPC para setar contexto de auditoria na sessão atual
-- Deve ser chamada pelo frontend antes de operações de escrita
-- para que os triggers de audit_log capturem quem fez a operação
CREATE OR REPLACE FUNCTION public.set_audit_context(
  p_user_id uuid DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_user_nome text DEFAULT NULL,
  p_is_impersonation boolean DEFAULT false,
  p_impersonated_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  PERFORM set_config('app.current_user_id', COALESCE(p_user_id::text, ''), true);
  PERFORM set_config('app.current_user_email', COALESCE(p_user_email, ''), true);
  PERFORM set_config('app.current_user_nome', COALESCE(p_user_nome, ''), true);
  PERFORM set_config('app.is_impersonation', COALESCE(p_is_impersonation::text, 'false'), true);
  PERFORM set_config('app.impersonated_by', COALESCE(p_impersonated_by::text, ''), true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_audit_context(uuid, text, text, boolean, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_audit_context(uuid, text, text, boolean, uuid) TO authenticated;;
