-- Make placa column nullable in registros_abastecimento
ALTER TABLE public.registros_abastecimento 
ALTER COLUMN placa DROP NOT NULL;;
