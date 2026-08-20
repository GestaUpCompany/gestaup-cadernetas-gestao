CREATE OR REPLACE FUNCTION public.temp_update_controller_password(p_user_id uuid, p_new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, extensions.gen_salt('bf'))
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$function$;;
