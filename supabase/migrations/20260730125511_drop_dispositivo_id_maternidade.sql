DROP INDEX IF EXISTS public.idx_maternidade_dispositivo;
ALTER TABLE public.registros_maternidade DROP COLUMN IF EXISTS dispositivo_id;;
