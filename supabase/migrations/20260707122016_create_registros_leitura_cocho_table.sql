CREATE TABLE IF NOT EXISTS public.registros_leitura_cocho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  dispositivo_id uuid REFERENCES public.dispositivos(id) ON DELETE SET NULL,
  nome_usuario text,
  data timestamp with time zone NOT NULL,
  responsavel text,
  pasto_curral text,
  pasto_id uuid REFERENCES public.pastos(id) ON DELETE SET NULL,
  lote text,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  leitura_cocho integer,
  observacao text,
  sync_status text DEFAULT 'pending',
  version integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_registros_leitura_cocho_fazenda_id ON public.registros_leitura_cocho(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_registros_leitura_cocho_data ON public.registros_leitura_cocho(data);
CREATE INDEX IF NOT EXISTS idx_registros_leitura_cocho_sync_status ON public.registros_leitura_cocho(sync_status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS registros_leitura_cocho_updated_at ON public.registros_leitura_cocho;
CREATE TRIGGER registros_leitura_cocho_updated_at
  BEFORE UPDATE ON public.registros_leitura_cocho
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Habilitar RLS (sem políticas; o usuário deve criar políticas adequadas)
ALTER TABLE public.registros_leitura_cocho ENABLE ROW LEVEL SECURITY;;
