-- Políticas para registros_entrada_insumos
CREATE POLICY "Users can view farm input entry records" ON public.registros_entrada_insumos
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm input entry records" ON public.registros_entrada_insumos
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

-- Políticas para registros_saida_insumos
CREATE POLICY "Users can view farm input output records" ON public.registros_saida_insumos
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm input output records" ON public.registros_saida_insumos
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
