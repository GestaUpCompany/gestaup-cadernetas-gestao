-- Criar tabela registros_limpeza
CREATE TABLE IF NOT EXISTS public.registros_limpeza (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES public.dispositivos(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  numero_equipe INTEGER,
  setor TEXT,
  local TEXT,
  hora_inicio TEXT,
  hora_final TEXT,
  limpeza_realizada JSONB DEFAULT '[]'::jsonb,
  observacao TEXT,
  nome_usuario TEXT,
  sync_status TEXT DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_registros_limpeza_fazenda_id ON public.registros_limpeza(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_registros_limpeza_dispositivo_id ON public.registros_limpeza(dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_registros_limpeza_data ON public.registros_limpeza(data);
CREATE INDEX IF NOT EXISTS idx_registros_limpeza_sync_status ON public.registros_limpeza(sync_status);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_registros_limpeza_updated_at ON public.registros_limpeza;
CREATE TRIGGER update_registros_limpeza_updated_at
  BEFORE UPDATE ON public.registros_limpeza
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
