-- Simplificação da programação de tratos
--
-- Adiciona campo tipo (engorda/sequestro) na programacao_tratos com unique(fazenda_id, tipo).
-- Remove a dependência de kg por curral (a tela agora só baliza percentuais por trato).

-- Adiciona coluna tipo
ALTER TABLE public.programacao_tratos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'engorda' CHECK (tipo IN ('engorda', 'sequestro'));

-- Garante que só existe uma programação ativa por tipo por fazenda
DROP INDEX IF EXISTS idx_programacao_tratos_fazenda_tipo;
CREATE UNIQUE INDEX idx_programacao_tratos_fazenda_tipo ON public.programacao_tratos (fazenda_id, tipo) WHERE ativo = true;

-- A tabela programacao_tratos_currais passa a ser opcional (não usada na fase 1 simplificada)
-- mas mantida no schema para uso futuro quando o PWA precisar
