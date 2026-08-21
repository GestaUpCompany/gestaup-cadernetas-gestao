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
GRANT EXECUTE ON FUNCTION public.set_audit_context(uuid, text, text, boolean, uuid, text, text, text, text) TO authenticated;;
