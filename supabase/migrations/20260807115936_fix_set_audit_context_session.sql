-- Usar set_config com is_local=false (session-level) em vez de true (transaction-level)
-- para que o contexto persista na conexão backend entre transações do pool
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
  -- is_local=false (session-level) persiste na conexão backend entre transações
  -- Com PgBouncer transaction mode, pode vazar para outros clients na mesma conexão,
  -- mas é sobrescrito a cada nova chamada e é melhor que NULL para auditoria
  PERFORM set_config('app.current_user_id', COALESCE(p_user_id::text, ''), false);
  PERFORM set_config('app.current_user_email', COALESCE(p_user_email, ''), false);
  PERFORM set_config('app.current_user_nome', COALESCE(p_user_nome, ''), false);
  PERFORM set_config('app.is_impersonation', COALESCE(p_is_impersonation::text, 'false'), false);
  PERFORM set_config('app.impersonated_by', COALESCE(p_impersonated_by::text, ''), false);
END;
$function$;;
