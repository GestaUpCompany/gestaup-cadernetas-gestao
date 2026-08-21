-- Create setores table
CREATE TABLE public.setores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index on fazenda_id for faster queries
CREATE INDEX idx_setores_fazenda_id ON public.setores(fazenda_id);

-- Create index on deleted_at for soft deletes
CREATE INDEX idx_setores_deleted_at ON public.setores(deleted_at);;
