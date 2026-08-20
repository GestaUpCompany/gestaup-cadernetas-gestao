-- Drop the old constraint
ALTER TABLE public.itens_supermercado DROP CONSTRAINT itens_supermercado_unidade_medida_check;

-- Add new constraint with the correct values
ALTER TABLE public.itens_supermercado 
ADD CONSTRAINT itens_supermercado_unidade_medida_check 
CHECK (unidade_medida IN ('kg', 'L', 'Unidades', 'Pacotes'));;
