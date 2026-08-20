-- Create locais table
CREATE TABLE public.locais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index on fazenda_id for faster queries
CREATE INDEX idx_locais_fazenda_id ON public.locais(fazenda_id);

-- Create index on deleted_at for soft deletes
CREATE INDEX idx_locais_deleted_at ON public.locais(deleted_at);;
