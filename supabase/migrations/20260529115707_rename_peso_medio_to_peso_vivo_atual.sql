-- Rename peso_medio_kg to peso_vivo_atual_kg
ALTER TABLE public.registros_movimentacao 
RENAME COLUMN peso_medio_kg TO peso_vivo_atual_kg;;
