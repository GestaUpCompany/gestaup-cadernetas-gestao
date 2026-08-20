-- Rename produto_aplicado to insumo_aplicado in registros_operacoes_maquinas
ALTER TABLE public.registros_operacoes_maquinas 
RENAME COLUMN produto_aplicado TO insumo_aplicado;;
