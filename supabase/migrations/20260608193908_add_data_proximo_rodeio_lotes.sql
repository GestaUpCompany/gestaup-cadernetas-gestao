-- 1. Add data_proximo_rodeio to lotes
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS data_proximo_rodeio date;

-- 2. Create trigger function: when a new rodeio is recorded, update the batch's next rodeio date
CREATE OR REPLACE FUNCTION public.update_lote_proximo_rodeio()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_meta_dias INTEGER;
BEGIN
  -- Only update if lote_id is present
  IF NEW.lote_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get meta interval for this batch
  SELECT meta_intervalo_rodeio_dias INTO v_meta_dias
  FROM public.lotes
  WHERE id = NEW.lote_id;

  -- Update next rodeio date = current date + meta interval
  IF v_meta_dias IS NOT NULL AND v_meta_dias > 0 THEN
    UPDATE public.lotes
    SET data_proximo_rodeio = (CURRENT_DATE + v_meta_dias)
    WHERE id = NEW.lote_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Drop and recreate trigger on registros_rodeio
DROP TRIGGER IF EXISTS trg_update_proximo_rodeio ON public.registros_rodeio;

CREATE TRIGGER trg_update_proximo_rodeio
AFTER INSERT ON public.registros_rodeio
FOR EACH ROW
EXECUTE FUNCTION public.update_lote_proximo_rodeio();

-- 4. Backfill existing data: for each batch with rodeio records, set data_proximo_rodeio based on latest rodeio
UPDATE public.lotes l
SET data_proximo_rodeio = (
  SELECT MAX(rr.data)::date + COALESCE(l.meta_intervalo_rodeio_dias, 0)
  FROM public.registros_rodeio rr
  WHERE rr.lote_id = l.id AND rr.deleted_at IS NULL
)
WHERE EXISTS (
  SELECT 1 FROM public.registros_rodeio rr2
  WHERE rr2.lote_id = l.id AND rr2.deleted_at IS NULL
)
AND l.meta_intervalo_rodeio_dias IS NOT NULL
AND l.meta_intervalo_rodeio_dias > 0;;
