
-- Add MS% and price per ton to insumos
ALTER TABLE insumos 
  ADD COLUMN IF NOT EXISTS ms_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS preco_ton NUMERIC;

-- Add formulation parameters to dietas
ALTER TABLE dietas
  ADD COLUMN IF NOT EXISTS meta_consumo_ms_percent_pv NUMERIC,
  ADD COLUMN IF NOT EXISTS peso_vivo_atual NUMERIC;
;
