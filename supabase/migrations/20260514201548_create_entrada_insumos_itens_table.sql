-- Criar tabela de itens para entrada
CREATE TABLE entrada_insumos_itens (
  id UUID DEFAULT gen_random_uuid(),
  entrada_id UUID NOT NULL REFERENCES registros_entrada_insumos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC,
  valor_total NUMERIC,
  PRIMARY KEY (id)
);

-- Índices para performance
CREATE INDEX idx_entrada_itens_entrada_id ON entrada_insumos_itens(entrada_id);
CREATE INDEX idx_entrada_itens_insumo_id ON entrada_insumos_itens(insumo_id);;
