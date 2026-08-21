ALTER TABLE registros_suplementacao
ADD COLUMN IF NOT EXISTS consumo_medio_geral_percent_pv NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS consumo_medio_30dias_percent_pv NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS consumo_medio_geral_kg_mn NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS consumo_medio_30dias_kg_mn NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS consumo_medio_geral_kg_ms NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS consumo_medio_30dias_kg_ms NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS custo_medio_reais_cab_dia NUMERIC(10,6);;
