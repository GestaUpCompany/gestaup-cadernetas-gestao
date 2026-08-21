-- Adicionar campos para melhor controle de estoque e relatórios
ALTER TABLE insumos
ADD COLUMN IF NOT EXISTS marca TEXT,
ADD COLUMN IF NOT EXISTS fabricante TEXT,
ADD COLUMN IF NOT EXISTS peso_saco NUMERIC,
ADD COLUMN IF NOT EXISTS custo_saco NUMERIC,
ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC,
ADD COLUMN IF NOT EXISTS estoque_minimo NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fornecedor TEXT;

-- Adicionar campo calculado para custo total do estoque
ALTER TABLE insumos
ADD COLUMN IF NOT EXISTS custo_total_estoque NUMERIC GENERATED ALWAYS AS (estoque_atual * custo_unitario) STORED;

-- Adicionar comentários
COMMENT ON COLUMN insumos.marca IS 'Marca do produto';
COMMENT ON COLUMN insumos.fabricante IS 'Fabricante do produto';
COMMENT ON COLUMN insumos.peso_saco IS 'Peso do saco em kg';
COMMENT ON COLUMN insumos.custo_saco IS 'Custo por saco';
COMMENT ON COLUMN insumos.custo_unitario IS 'Custo unitário por kg/unidade';
COMMENT ON COLUMN insumos.estoque_minimo IS 'Estoque mínimo para alerta';
COMMENT ON COLUMN insumos.fornecedor IS 'Fornecedor do produto';
COMMENT ON COLUMN insumos.custo_total_estoque IS 'Custo total do estoque atual (calculado automaticamente)';;
