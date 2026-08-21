-- Políticas para tabela usuarios
CREATE POLICY "Users can view own profile" ON public.usuarios
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.usuarios
FOR UPDATE TO authenticated
USING (id = auth.uid());

-- Políticas para tabela fazendas
CREATE POLICY "Users can view their farms" ON public.fazendas
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can update their farms" ON public.fazendas
FOR UPDATE TO authenticated
USING (
  id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

-- Políticas para tabela usuario_fazenda
CREATE POLICY "Users can view their farm associations" ON public.usuario_fazenda
FOR SELECT TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "Users can insert their farm associations" ON public.usuario_fazenda
FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Users can delete their farm associations" ON public.usuario_fazenda
FOR DELETE TO authenticated
USING (usuario_id = auth.uid());;
