CREATE TABLE movimentacao_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id),
  tabela_origem TEXT NOT NULL,
  registro_id UUID NOT NULL,
  tipo_movimentacao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  custo_unitario NUMERIC,
  custo_total NUMERIC,
  motivo TEXT,
  nota_fiscal TEXT,
  fornecedor TEXT,
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_movimentacao_estoque_fazenda ON movimentacao_estoque(fazenda_id);
CREATE INDEX idx_movimentacao_estoque_tabela_registro ON movimentacao_estoque(tabela_origem, registro_id);
CREATE INDEX idx_movimentacao_estoque_data ON movimentacao_estoque(data_movimentacao);
CREATE INDEX idx_movimentacao_estoque_tipo ON movimentacao_estoque(tipo_movimentacao);

COMMENT ON TABLE movimentacao_estoque IS 'Tabela única para rastrear movimentações de estoque de todos os produtos';
COMMENT ON COLUMN movimentacao_estoque.tabela_origem IS 'Nome da tabela de origem (insumos, mineral, proteinado, racao)';
COMMENT ON COLUMN movimentacao_estoque.registro_id IS 'ID do produto na tabela de origem';
COMMENT ON COLUMN movimentacao_estoque.tipo_movimentacao IS 'Tipo: entrada, saida, ajuste';
COMMENT ON COLUMN movimentacao_estoque.quantidade IS 'Quantidade movimentada';
COMMENT ON COLUMN movimentacao_estoque.custo_total IS 'Custo total da movimentação (quantidade * custo_unitario)';;
