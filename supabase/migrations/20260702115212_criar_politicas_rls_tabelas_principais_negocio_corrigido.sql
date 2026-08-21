-- Políticas para tabela individuos (já criadas anteriormente, mas vamos garantir)
CREATE POLICY "Users can view farm individuals" ON public.individuos
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm individuals" ON public.individuos
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

-- Políticas para tabela lotes
CREATE POLICY "Users can view farm lots" ON public.lotes
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm lots" ON public.lotes
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

-- Políticas para tabela lote_categorias (relacionada através de lotes)
CREATE POLICY "Users can view farm lot categories" ON public.lote_categorias
FOR SELECT TO authenticated
USING (
  lote_id IN (
    SELECT id 
    FROM public.lotes 
    WHERE fazenda_id IN (
      SELECT fazenda_id 
      FROM public.usuario_fazenda 
      WHERE usuario_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage farm lot categories" ON public.lote_categorias
FOR ALL TO authenticated
USING (
  lote_id IN (
    SELECT id 
    FROM public.lotes 
    WHERE fazenda_id IN (
      SELECT fazenda_id 
      FROM public.usuario_fazenda 
      WHERE usuario_id = auth.uid()
    )
  )
)
WITH CHECK (
  lote_id IN (
    SELECT id 
    FROM public.lotes 
    WHERE fazenda_id IN (
      SELECT fazenda_id 
      FROM public.usuario_fazenda 
      WHERE usuario_id = auth.uid()
    )
  )
);;
