CREATE TABLE public.registros_morte (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL,
  dispositivo_id UUID,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto TEXT,
  lote TEXT,
  brinco_chip TEXT,
  vaca INTEGER DEFAULT 0,
  touro INTEGER DEFAULT 0,
  boi_gordo INTEGER DEFAULT 0,
  boi_magro INTEGER DEFAULT 0,
  garrote INTEGER DEFAULT 0,
  bezerro INTEGER DEFAULT 0,
  novilha INTEGER DEFAULT 0,
  tropa INTEGER DEFAULT 0,
  outros INTEGER DEFAULT 0,
  sexo TEXT,
  raca TEXT,
  idade TEXT,
  peso_vivo INTEGER,
  causa_morte TEXT,
  secrecao_orificios BOOLEAN DEFAULT false,
  secrecao_orificios_obs TEXT,
  sintomas_pneumonia BOOLEAN DEFAULT false,
  sintomas_pneumonia_obs TEXT,
  inchaco BOOLEAN DEFAULT false,
  inchaco_obs TEXT,
  incoordenacao_tremores BOOLEAN DEFAULT false,
  incoordenacao_tremores_obs TEXT,
  apatia_fraqueza BOOLEAN DEFAULT false,
  apatia_fraqueza_obs TEXT,
  presenca_sangue BOOLEAN DEFAULT false,
  presenca_sangue_obs TEXT,
  desordens_digestivas BOOLEAN DEFAULT false,
  desordens_digestivas_obs TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Criar índices
CREATE INDEX idx_registros_morte_fazenda_id ON public.registros_morte(fazenda_id);
CREATE INDEX idx_registros_morte_data ON public.registros_morte(data);
CREATE INDEX idx_registros_morte_sync_status ON public.registros_morte(sync_status);

-- Habilitar RLS
ALTER TABLE public.registros_morte ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS iguais às da tabela pastos
CREATE POLICY "Anon delete registros_morte" ON public.registros_morte
FOR DELETE TO anon
USING (true);

CREATE POLICY "Anon insert registros_morte" ON public.registros_morte
FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Anon select registros_morte" ON public.registros_morte
FOR SELECT TO anon
USING (true);

CREATE POLICY "Anon update registros_morte" ON public.registros_morte
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_registros_morte()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_update_registros_morte
BEFORE UPDATE ON public.registros_morte
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_registros_morte();;
