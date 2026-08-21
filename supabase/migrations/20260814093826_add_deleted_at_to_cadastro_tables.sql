-- Adiciona deleted_at nas tabelas de cadastro que ainda nao tem
-- Padroniza soft delete em todo o sistema: ativo controla visibilidade, deleted_at marca exclusao

ALTER TABLE bebedouros ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE causas_morte ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE faixas_categorias ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE formulacoes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE implementos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE itens_almoxarifado ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE itens_supermercado ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE mapa_estradas ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE mapa_pontos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE pluviometros ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- maquinas_veiculos tem deleted_at mas nao tem ativo (usa status)
-- Adicionar ativo para padronizar com as demais
ALTER TABLE maquinas_veiculos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Indices para performance nas queries com filtro deleted_at
CREATE INDEX IF NOT EXISTS idx_bebedouros_deleted_at ON bebedouros(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_causas_morte_deleted_at ON causas_morte(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faixas_categorias_deleted_at ON faixas_categorias(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formulacoes_deleted_at ON formulacoes(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_deleted_at ON funcionarios(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_implementos_deleted_at ON implementos(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insumos_deleted_at ON insumos(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_itens_almoxarifado_deleted_at ON itens_almoxarifado(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_itens_supermercado_deleted_at ON itens_supermercado(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mapa_estradas_deleted_at ON mapa_estradas(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mapa_pontos_deleted_at ON mapa_pontos(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pluviometros_deleted_at ON pluviometros(deleted_at) WHERE deleted_at IS NOT NULL;;
