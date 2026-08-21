-- Habilitar RLS na tabela medicamentos (se já não estiver habilitado)
ALTER TABLE public.medicamentos ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados leiam medicamentos da sua fazenda
CREATE POLICY "Usuários podem ver medicamentos da própria fazenda" 
ON public.medicamentos 
FOR SELECT 
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

-- Política para permitir que usuários autenticados insiram medicamentos na sua fazenda
CREATE POLICY "Usuários podem inserir medicamentos na própria fazenda" 
ON public.medicamentos 
FOR INSERT 
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

-- Política para permitir que usuários autenticados atualizem medicamentos da sua fazenda
CREATE POLICY "Usuários podem atualizar medicamentos da própria fazenda" 
ON public.medicamentos 
FOR UPDATE 
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

-- Política para permitir que usuários autenticados deletem medicamentos da sua fazenda
CREATE POLICY "Usuários podem deletar medicamentos da própria fazenda" 
ON public.medicamentos 
FOR DELETE 
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);;
