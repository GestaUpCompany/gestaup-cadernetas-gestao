-- Criar tabela registros_problemas
CREATE TABLE IF NOT EXISTS public.registros_problemas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES public.dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  setor TEXT,
  local TEXT,
  descricao_problema TEXT,
  causa_identificada BOOLEAN DEFAULT false,
  causa_identificada_obs TEXT,
  acao_corretiva_realizada BOOLEAN DEFAULT false,
  acao_corretiva_realizada_obs TEXT,
  tipo_ocorrencia TEXT,
  tipo_ocorrencia_obs TEXT,
  causa_raiz_identificada BOOLEAN DEFAULT false,
  causa_raiz_identificada_obs TEXT,
  gravidade_impacto TEXT,
  gravidade_impacto_obs TEXT,
  tipo_problema TEXT,
  tipo_problema_obs TEXT,
  prioridade TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_registros_problemas_fazenda_id ON public.registros_problemas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_registros_problemas_dispositivo_id ON public.registros_problemas(dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_registros_problemas_data ON public.registros_problemas(data);
CREATE INDEX IF NOT EXISTS idx_registros_problemas_sync_status ON public.registros_problemas(sync_status);
CREATE INDEX IF NOT EXISTS idx_registros_problemas_deleted_at ON public.registros_problemas(deleted_at);

-- Adicionar comentários
COMMENT ON TABLE public.registros_problemas IS 'Registros de problemas reportados na fazenda';
COMMENT ON COLUMN public.registros_problemas.setor IS 'Setor onde ocorreu o problema (Gado, Máquinas, ADM, Fábrica, Manutenção, Terceirizado)';
COMMENT ON COLUMN public.registros_problemas.causa_identificada IS 'Indica se a causa do problema foi identificada';
COMMENT ON COLUMN public.registros_problemas.acao_corretiva_realizada IS 'Indica se ação corretiva foi realizada';
COMMENT ON COLUMN public.registros_problemas.tipo_ocorrencia IS 'Tipo de ocorrência (Única ou Repetitiva)';
COMMENT ON COLUMN public.registros_problemas.causa_raiz_identificada IS 'Indica se a causa raiz foi identificada';
COMMENT ON COLUMN public.registros_problemas.gravidade_impacto IS 'Gravidade ou impacto do problema (baixa, média, alta)';
COMMENT ON COLUMN public.registros_problemas.tipo_problema IS 'Tipo de problema (Estrutural, Máquinas, Processos, Rebanho)';
COMMENT ON COLUMN public.registros_problemas.prioridade IS 'Prioridade do problema (baixa, média, alta)';;
