CREATE TABLE maquinas_veiculos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Maquina', 'Veiculo')),
  categoria TEXT NOT NULL CHECK (categoria IN ('Trator', 'Colheitadeira', 'Caminhao')),
  modelo TEXT,
  ano INTEGER,
  placa TEXT,
  tipo_combustivel TEXT CHECK (tipo_combustivel IN ('Diesel S10', 'Diesel S500', 'Diesel Comum', 'Gasolina', 'Alcool')),
  capacidade NUMERIC,
  horimetro NUMERIC,
  quilometragem NUMERIC,
  custo_hora NUMERIC,
  custo_km NUMERIC,
  operador_padrao TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Manutencao')),
  data_ultima_manutencao DATE,
  data_proxima_manutencao DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index on fazenda_id for faster queries
CREATE INDEX idx_maquinas_veiculos_fazenda_id ON maquinas_veiculos(fazenda_id);

-- Create index on deleted_at for soft deletes
CREATE INDEX idx_maquinas_veiculos_deleted_at ON maquinas_veiculos(deleted_at);

-- Enable RLS
ALTER TABLE maquinas_veiculos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view maquinas_veiculos from their fazenda"
  ON maquinas_veiculos FOR SELECT
  USING (fazenda_id IN (SELECT fazenda_id FROM usuario_fazenda WHERE usuario_id = auth.uid()));

CREATE POLICY "Users can insert maquinas_veiculos in their fazenda"
  ON maquinas_veiculos FOR INSERT
  WITH CHECK (fazenda_id IN (SELECT fazenda_id FROM usuario_fazenda WHERE usuario_id = auth.uid()));

CREATE POLICY "Users can update maquinas_veiculos in their fazenda"
  ON maquinas_veiculos FOR UPDATE
  USING (fazenda_id IN (SELECT fazenda_id FROM usuario_fazenda WHERE usuario_id = auth.uid()))
  WITH CHECK (fazenda_id IN (SELECT fazenda_id FROM usuario_fazenda WHERE usuario_id = auth.uid()));

CREATE POLICY "Users can delete maquinas_veiculos in their fazenda"
  ON maquinas_veiculos FOR DELETE
  USING (fazenda_id IN (SELECT fazenda_id FROM usuario_fazenda WHERE usuario_id = auth.uid()));;
