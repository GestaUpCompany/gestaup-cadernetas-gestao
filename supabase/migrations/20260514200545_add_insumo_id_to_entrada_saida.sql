-- Adicionar insumo_id em entrada
ALTER TABLE registros_entrada_insumos ADD COLUMN insumo_id UUID REFERENCES insumos(id);

-- Adicionar insumo_id em saída
ALTER TABLE registros_saida_insumos ADD COLUMN insumo_id UUID REFERENCES insumos(id);

-- Criar tabela de itens para saída
CREATE TABLE saida_insumos_itens (
  id UUID DEFAULT gen_random_uuid(),
  saida_id UUID NOT NULL REFERENCES registros_saida_insumos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  quantidade NUMERIC NOT NULL,
  PRIMARY KEY (id)
);

-- Índices para performance
CREATE INDEX idx_saida_itens_saida_id ON saida_insumos_itens(saida_id);
CREATE INDEX idx_saida_itens_insumo_id ON saida_insumos_itens(insumo_id);;
