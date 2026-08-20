-- Restaurar coluna peso_vivo_kg para compatibilidade com sistema mobile
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS peso_vivo_kg numeric;;
