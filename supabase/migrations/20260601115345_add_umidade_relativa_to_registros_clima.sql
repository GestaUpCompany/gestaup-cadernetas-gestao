-- Add umidade_relativa column to registros_clima table
ALTER TABLE public.registros_clima ADD COLUMN IF NOT EXISTS umidade_relativa numeric;;
