-- Create lote_categorias table for category-specific data
CREATE TABLE lote_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL, -- 'vaca', 'touro', 'boi gordo', 'boi magro', 'garrote', 'bezerro', 'novilha', 'tropa'
  
  -- Dados de Pesagem e Crescimento
  quant_inicial INTEGER,
  data_pesagem DATE,
  peso_entrada NUMERIC(10,2),
  peso_entrada_arrobas NUMERIC(10,2), -- Calculado: (peso_entrada * rc_inicial) / 15
  gmd NUMERIC(10,3),
  periodo INTEGER, -- Calculado: CURRENT_DATE - data_pesagem
  rc_inicial NUMERIC(5,2),
  
  -- Dados Atuais
  quant_atual INTEGER, -- Calculado: quant_inicial - morte - consumo - abate - transf_saida + transf_entrada
  peso_vivo_kg NUMERIC(10,2), -- Calculado: peso_entrada + (gmd * periodo)
  peso_vivo_meta_kg NUMERIC(10,2),
  dias_restantes_meta INTEGER, -- Calculado: (data_meta - data_pesagem) - periodo
  data_meta DATE,
  estrategia_nutricional TEXT,
  
  -- Dados de Identificação
  raca TEXT,
  sexo TEXT,
  idade INTEGER,
  
  -- Dados Financeiros
  preco_animal_kg NUMERIC(10,2),
  preco_animal_cab NUMERIC(10,2),
  custo_operacional NUMERIC(10,2),
  
  -- Dados de Movimentação
  morte INTEGER DEFAULT 0,
  consumo INTEGER DEFAULT 0,
  abate INTEGER DEFAULT 0,
  transf_entrada INTEGER DEFAULT 0,
  transf_saida INTEGER DEFAULT 0,
  qtd_bezerros INTEGER,
  
  -- Metadados
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_lote_categoria UNIQUE (lote_id, categoria)
);

-- Create indexes for performance
CREATE INDEX idx_lote_categorias_lote_id ON lote_categorias(lote_id);
CREATE INDEX idx_lote_categorias_categoria ON lote_categorias(categoria);

-- Create trigger for updated_at
CREATE TRIGGER update_lote_categorias_updated_at
  BEFORE UPDATE ON lote_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
