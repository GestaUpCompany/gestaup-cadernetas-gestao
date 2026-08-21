-- Add maquina_veiculo_id column to registros_operacoes_maquinas
ALTER TABLE public.registros_operacoes_maquinas 
ADD COLUMN maquina_veiculo_id UUID;;
