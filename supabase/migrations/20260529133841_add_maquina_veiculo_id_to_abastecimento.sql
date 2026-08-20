-- Add maquina_veiculo_id column to registros_abastecimento
ALTER TABLE public.registros_abastecimento 
ADD COLUMN maquina_veiculo_id UUID;;
