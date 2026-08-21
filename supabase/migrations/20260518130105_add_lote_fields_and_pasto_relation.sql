-- Adicionar colunas na tabela lotes
ALTER TABLE lotes 
ADD COLUMN IF NOT EXISTS pasto_id uuid REFERENCES pastos(id),
ADD COLUMN IF NOT EXISTS raca text,
ADD COLUMN IF NOT EXISTS sexo text,
ADD COLUMN IF NOT EXISTS idade_meses integer,
ADD COLUMN IF NOT EXISTS rc_inicial numeric,
ADD COLUMN IF NOT EXISTS preco_kg numeric,
ADD COLUMN IF NOT EXISTS preco_cab numeric,
ADD COLUMN IF NOT EXISTS custo_operacional numeric,
ADD COLUMN IF NOT EXISTS estrategia_nutricional text,
ADD COLUMN IF NOT EXISTS dias_restantes_meta integer,
ADD COLUMN IF NOT EXISTS produtor_rural text,
ADD COLUMN IF NOT EXISTS propriedade_origem text,
ADD COLUMN IF NOT EXISTS numero_contrato text,
ADD COLUMN IF NOT EXISTS mes_competencia text,
ADD COLUMN IF NOT EXISTS data_liberacao_sisbov date,
ADD COLUMN IF NOT EXISTS periodo_liberacao_sisbov text,
ADD COLUMN IF NOT EXISTS data_embarque_previsto date,
ADD COLUMN IF NOT EXISTS quant_inicial integer;

-- Criar índice para pasto_id
CREATE INDEX IF NOT EXISTS idx_lotes_pasto_id ON lotes(pasto_id);;
