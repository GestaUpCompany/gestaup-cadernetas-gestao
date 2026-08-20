ALTER TABLE public.registros_maternidade ALTER COLUMN tipo_parto TYPE JSONB USING '[]'::JSONB;;
