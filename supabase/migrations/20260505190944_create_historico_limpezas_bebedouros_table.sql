CREATE TABLE public.historico_limpezas_bebedouros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  bebedouro_id UUID NOT NULL REFERENCES bebedouros(id) ON DELETE CASCADE,
  data_limpeza DATE NOT NULL,
  responsavel TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_historico_limpezas_bebedouro_id ON public.historico_limpezas_bebedouros(bebedouro_id);
CREATE INDEX idx_historico_limpezas_fazenda_id ON public.historico_limpezas_bebedouros(fazenda_id);
CREATE INDEX idx_historico_limpezas_data ON public.historico_limpezas_bebedouros(data_limpeza DESC);;
