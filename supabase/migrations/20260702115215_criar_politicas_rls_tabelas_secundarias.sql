-- Políticas para tabela categorias
CREATE POLICY "Users can view farm categories" ON public.categorias
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm categories" ON public.categorias
FOR ALL TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
)
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

-- Políticas para tabela racas
CREATE POLICY "Users can view farm breeds" ON public.racas
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm breeds" ON public.racas
FOR ALL TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
)
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

-- Políticas para tabela pastos
CREATE POLICY "Users can view farm pastures" ON public.pastos
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm pastures" ON public.pastos
FOR ALL TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
)
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);;
