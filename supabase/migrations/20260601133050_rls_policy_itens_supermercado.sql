-- Enable RLS
ALTER TABLE public.itens_supermercado ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to select rows from their fazenda
CREATE POLICY "Users can view itens_supermercado from their fazenda"
ON public.itens_supermercado FOR SELECT
TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid() AND ativo = true
  )
);

-- Policy to allow authenticated users to insert rows for their fazenda
CREATE POLICY "Users can insert itens_supermercado for their fazenda"
ON public.itens_supermercado FOR INSERT
TO authenticated
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid() AND ativo = true
  )
);

-- Policy to allow authenticated users to update rows from their fazenda
CREATE POLICY "Users can update itens_supermercado from their fazenda"
ON public.itens_supermercado FOR UPDATE
TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid() AND ativo = true
  )
)
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid() AND ativo = true
  )
);

-- Policy to allow authenticated users to delete rows from their fazenda
CREATE POLICY "Users can delete itens_supermercado from their fazenda"
ON public.itens_supermercado FOR DELETE
TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid() AND ativo = true
  )
);;
