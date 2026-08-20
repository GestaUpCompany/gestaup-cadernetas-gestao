-- F1.3: Criar RPC salvar_notificacoes_config
CREATE OR REPLACE FUNCTION public.salvar_notificacoes_config(
  p_fazenda_id uuid,
  p_threshold_recategorizacao numeric,
  p_recategorizacao_ativo boolean
)
RETURNS public.notificacoes_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result public.notificacoes_config;
BEGIN
  -- Upsert
  INSERT INTO public.notificacoes_config (
    fazenda_id, threshold_recategorizacao, recategorizacao_ativo, updated_at
  ) VALUES (
    p_fazenda_id, p_threshold_recategorizacao, p_recategorizacao_ativo, now()
  )
  ON CONFLICT (fazenda_id) DO UPDATE SET
    threshold_recategorizacao = EXCLUDED.threshold_recategorizacao,
    recategorizacao_ativo = EXCLUDED.recategorizacao_ativo,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

SELECT 'RPC salvar_notificacoes_config criada' AS status;;
