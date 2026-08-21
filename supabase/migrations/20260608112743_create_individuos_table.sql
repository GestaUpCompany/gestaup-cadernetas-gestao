-- Create individuos table with all 46 columns
CREATE TABLE individuos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  
  -- Identification
  id_manejo TEXT,
  id_brinco TEXT,
  id_chip TEXT,
  
  -- Basic info
  sexo TEXT NOT NULL CHECK (sexo IN ('Macho', 'Fêmea')),
  categoria TEXT NOT NULL CHECK (categoria IN ('Bezerro ao Pé', 'Bezerra ao Pé', 'Bezerro Desmama', 'Bezerra Desmama', 'Garrote', 'Novilha', 'Boi Magro', 'Primípara', 'Vaca Parida', 'Vaca Prenha', 'Vaca Vazia', 'Vaca Descarte', 'Touro')),
  raca TEXT NOT NULL CHECK (raca IN ('Aberdeen Angus', 'Anelorado', 'Blonde', 'Brangus', 'Caracu', 'Charolês', 'Gir', 'Girolando', 'Guzerá', 'Limousin', 'Nelore', 'Red Angus', 'Senepol', 'Simental', 'SRD', 'Tabapuã', 'Wagyu')),
  
  -- Birth info
  data_nascimento DATE,
  peso_nascimento_kg NUMERIC(10,2),
  parto TEXT CHECK (parto IN ('Aborto', 'Auxiliado', 'Cesárea', 'Distócico', 'Gêmeos', 'Natimorto', 'Normal')),
  
  -- Origin info
  origem TEXT CHECK (origem IN ('Compra', 'Doação', 'Nascimento', 'Transferência')),
  data_entrada_fazenda DATE,
  pv_entrada_kg NUMERIC(10,2),
  rc_inicial_kg NUMERIC(10,2),
  pv_entrada_arroba NUMERIC(10,2),
  preco_entrada_reais_kg NUMERIC(10,2),
  preco_entrada_reais_arroba NUMERIC(10,2),
  preco_entrada_reais_cabeca NUMERIC(10,2),
  preco_arroba_boi_gordo NUMERIC(10,2),
  agio_desagio NUMERIC(10,2),
  
  -- Lote info
  data_formacao_lote DATE,
  lote_atual UUID REFERENCES lotes(id) ON DELETE SET NULL,
  
  -- Health
  protocolo_sanitario TEXT,
  
  -- Supplier
  fornecedor UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  
  -- Properties
  propriedade_origem TEXT,
  propriedade_atual TEXT,
  
  -- Parentage
  pai UUID REFERENCES individuos(id) ON DELETE SET NULL,
  mae UUID REFERENCES individuos(id) ON DELETE SET NULL,
  
  -- Nutritional strategy (polymorphic)
  estrategia_nutricional_tipo TEXT CHECK (estrategia_nutricional_tipo IN ('insumo', 'mineral', 'proteinado', 'racao')),
  estrategia_nutricional_id UUID,
  estrategia_nutricional_nome TEXT,
  
  -- Performance
  gmd_kg_cab_dia NUMERIC(10,2),
  periodo_ultima_estrategia_nutricional_dias INTEGER,
  periodo_fazenda_dias INTEGER,
  peso_atual_kg NUMERIC(10,2),
  peso_meta_kg NUMERIC(10,2),
  
  -- Desmama
  data_desmama DATE,
  peso_desmama_kg NUMERIC(10,2),
  periodo_desmama_dias INTEGER,
  periodo_desmama_meses INTEGER,
  
  -- Age (computed)
  idade_atual_dias INTEGER,
  idade_atual_meses INTEGER,
  
  -- Location
  pasto_atual UUID REFERENCES pastos(id) ON DELETE SET NULL,
  setor_atual UUID REFERENCES setores(id) ON DELETE SET NULL,
  
  -- SISBOV
  data_insercao_rastreabilidade DATE,
  periodo_noventena INTEGER,
  data_liberacao_sisbov DATE,
  periodo_restante_liberacao INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'Vivo' CHECK (status IN ('Vivo', 'Abatido', 'Doado', 'Morte', 'Transferido', 'Venda Vivo')),
  
  -- Standard audit fields
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index on fazenda_id for performance
CREATE INDEX idx_individuos_fazenda_id ON individuos(fazenda_id);
CREATE INDEX idx_individuos_lote_atual ON individuos(lote_atual);
CREATE INDEX idx_individuos_pai ON individuos(pai);
CREATE INDEX idx_individuos_mae ON individuos(mae);
CREATE INDEX idx_individuos_status ON individuos(status);
CREATE INDEX idx_individuos_deleted_at ON individuos(deleted_at);;
