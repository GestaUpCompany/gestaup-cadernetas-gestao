
CREATE OR REPLACE FUNCTION public.trg_inativar_curral_sem_lote_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lote_id IS NULL THEN
      NEW.ativo := false;
    ELSE
      NEW.ativo := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.lote_id IS NULL THEN
      NEW.ativo := false;
    ELSIF OLD.lote_id IS NULL AND NEW.lote_id IS NOT NULL THEN
      NEW.ativo := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
;
