-- Cria tabela de controle de exibição de checklists por período
CREATE TABLE IF NOT EXISTS public.checklist_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  cadernetas TEXT[] NOT NULL DEFAULT '{}',
  data_inicio DATE NOT NULL,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consulta eficiente
CREATE INDEX IF NOT EXISTS idx_checklist_regras_fazenda ON public.checklist_regras(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_checklist_regras_periodo ON public.checklist_regras(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_checklist_regras_ativo ON public.checklist_regras(ativo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_checklist_regras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_checklist_regras_updated_at ON public.checklist_regras;
CREATE TRIGGER update_checklist_regras_updated_at
  BEFORE UPDATE ON public.checklist_regras
  FOR EACH ROW EXECUTE FUNCTION public.update_checklist_regras_updated_at();

-- Comentários de documentação
COMMENT ON TABLE public.checklist_regras IS 'Regras de exibição de checklists por caderneta e período';
COMMENT ON COLUMN public.checklist_regras.cadernetas IS 'Slugs das cadernetas afetadas. Array vazio = todas as cadernetas';
COMMENT ON COLUMN public.checklist_regras.data_inicio IS 'Data inicial do período em que o checklist aparece';
COMMENT ON COLUMN public.checklist_regras.data_fim IS 'Data final do período. NULL = apenas o dia de data_inicio';
COMMENT ON COLUMN public.checklist_regras.ativo IS 'Se false, a regra é ignorada';;
