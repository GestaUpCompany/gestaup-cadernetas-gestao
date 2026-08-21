
-- Criar função que inativa curral sem lote
CREATE OR REPLACE FUNCTION public.trg_inativar_curral_sem_lote_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.lote_id IS NULL THEN
    NEW.ativo := false;
  END IF;
  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_currais_inativar_sem_lote ON public.currais;

CREATE TRIGGER trg_currais_inativar_sem_lote
BEFORE INSERT OR UPDATE ON public.currais
FOR EACH ROW
EXECUTE FUNCTION public.trg_inativar_curral_sem_lote_func();

-- Aplicar regra retroativamente para currais existentes sem lote
UPDATE public.currais
SET ativo = false
WHERE lote_id IS NULL
  AND ativo = true
  AND deleted_at IS NULL;
;
