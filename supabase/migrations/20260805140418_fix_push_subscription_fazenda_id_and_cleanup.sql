-- Corrige bug de troca de fazenda: atualiza fazenda_id no ON CONFLICT
-- Antes: o ON CONFLICT nao atualizava fazenda_id, entao quando o usuario
-- trocava de fazenda e re-registrava a mesma subscription (mesmo endpoint),
-- o registro continuava associado a fazenda antiga e pushes iam para fazenda errada.
CREATE OR REPLACE FUNCTION public.registrar_push_subscription(
  p_fazenda_id uuid,
  p_dispositivo_id text,
  p_endpoint text,
  p_keys_p256dh text,
  p_keys_auth text,
  p_funcionario_id uuid DEFAULT NULL::uuid
) RETURNS public.push_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result public.push_subscriptions;
BEGIN
  INSERT INTO public.push_subscriptions (
    fazenda_id, funcionario_id, dispositivo_id, endpoint, keys_p256dh, keys_auth
  ) VALUES (
    p_fazenda_id, p_funcionario_id, p_dispositivo_id, p_endpoint, p_keys_p256dh, p_keys_auth
  )
  ON CONFLICT (dispositivo_id, endpoint) DO UPDATE SET
    fazenda_id = p_fazenda_id,
    funcionario_id = COALESCE(p_funcionario_id, push_subscriptions.funcionario_id),
    keys_p256dh = p_keys_p256dh,
    keys_auth = p_keys_auth,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

-- Nova RPC para remover subscription do banco (usada no unregisterPushSubscription do PWA)
-- SECURITY DEFINER para bypassar RLS (o PWA usa anon key sem JWT na chamada de push)
CREATE OR REPLACE FUNCTION public.remover_push_subscription(
  p_dispositivo_id text,
  p_endpoint text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE dispositivo_id = p_dispositivo_id AND endpoint = p_endpoint;
END;
$function$;

-- GRANT EXECUTE para authenticated e anon (PWA usa anon key)
GRANT EXECUTE ON FUNCTION public.remover_push_subscription(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_push_subscription(text, text) TO anon;;
