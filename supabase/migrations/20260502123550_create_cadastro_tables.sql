-- Tabela de pastos
CREATE TABLE pastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  area_util_ha NUMERIC(10,2),
  especie TEXT,
  altura_entrada_cm NUMERIC(5,2),
  altura_saida_cm NUMERIC(5,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pastos
CREATE INDEX idx_pastos_fazenda ON pastos(fazenda_id);
CREATE INDEX idx_pastos_nome ON pastos(nome);
CREATE INDEX idx_pastos_ativo ON pastos(ativo);

-- Tabela de lotes
CREATE TABLE lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  n_cabecas INTEGER,
  categorias TEXT,
  peso_vivo_kg NUMERIC(10,2),
  qtd_bezerros INTEGER,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para lotes
CREATE INDEX idx_lotes_fazenda ON lotes(fazenda_id);
CREATE INDEX idx_lotes_nome ON lotes(nome);
CREATE INDEX idx_lotes_ativo ON lotes(ativo);

-- Tabela de categorias
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para categorias
CREATE INDEX idx_categorias_fazenda ON categorias(fazenda_id);
CREATE INDEX idx_categorias_nome ON categorias(nome);
CREATE INDEX idx_categorias_ativo ON categorias(ativo);

-- Tabela de insumos
CREATE TABLE insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  estoque_atual NUMERIC(10,2),
  unidade TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para insumos
CREATE INDEX idx_insumos_fazenda ON insumos(fazenda_id);
CREATE INDEX idx_insumos_nome ON insumos(nome);
CREATE INDEX idx_insumos_tipo ON insumos(tipo);
CREATE INDEX idx_insumos_ativo ON insumos(ativo);

-- Tabela de funcionarios
CREATE TABLE funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  telefone TEXT,
  cargo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para funcionarios
CREATE INDEX idx_funcionarios_fazenda ON funcionarios(fazenda_id);
CREATE INDEX idx_funcionarios_nome ON funcionarios(nome);
CREATE INDEX idx_funcionarios_ativo ON funcionarios(ativo);;
