CREATE OR REPLACE FUNCTION public.trigger_recalc_peso_lote_cat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Recalcular registros de suplementação
  PERFORM recalcular_peso_vivo_lote(
    NEW.lote_id,
    NEW.data_ajuste_peso IS DISTINCT FROM OLD.data_ajuste_peso
  );

  RETURN NEW;
END;
$function$;;
