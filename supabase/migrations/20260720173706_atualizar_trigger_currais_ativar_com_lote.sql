
CREATE OR REPLACE FUNCTION public.trg_inativar_curral_sem_lote_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS trg_currais_inativar_sem_lote ON public.currais;

CREATE TRIGGER trg_currais_inativar_sem_lote
BEFORE INSERT OR UPDATE ON public.currais
FOR EACH ROW
EXECUTE FUNCTION public.trg_inativar_curral_sem_lote_func();
;
