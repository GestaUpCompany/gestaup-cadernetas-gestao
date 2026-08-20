-- Create itens_supermercado table
CREATE TABLE public.itens_supermercado (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id uuid NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  unidade_medida text NOT NULL CHECK (unidade_medida IN ('kg', 'unid.', 'pct')),
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX idx_itens_supermercado_fazenda_id ON public.itens_supermercado(fazenda_id);
CREATE INDEX idx_itens_supermercado_ativo ON public.itens_supermercado(ativo);

-- Enable RLS
ALTER TABLE public.itens_supermercado ENABLE ROW LEVEL SECURITY;

-- Users can view items from their farm
CREATE POLICY "Users can view itens_supermercado from their farm"
  ON public.itens_supermercado FOR SELECT
  USING (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid())
  );

-- Users can insert items for their farm
CREATE POLICY "Users can insert itens_supermercado for their farm"
  ON public.itens_supermercado FOR INSERT
  WITH CHECK (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid())
  );

-- Users can update items from their farm
CREATE POLICY "Users can update itens_supermercado from their farm"
  ON public.itens_supermercado FOR UPDATE
  USING (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid())
  );

-- Users can soft delete items from their farm
CREATE POLICY "Users can soft delete itens_supermercado from their farm"
  ON public.itens_supermercado FOR UPDATE
  USING (
    fazenda_id IN (SELECT fazenda_id FROM public.usuario_fazenda WHERE usuario_id = auth.uid())
  )
  WITH CHECK (ativo = false);;
