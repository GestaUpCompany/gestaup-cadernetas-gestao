-- Políticas para registros_maternidade
CREATE POLICY "Users can view farm maternity records" ON public.registros_maternidade
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm maternity records" ON public.registros_maternidade
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

-- Políticas para registros_pastagens
CREATE POLICY "Users can view farm pasture records" ON public.registros_pastagens
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm pasture records" ON public.registros_pastagens
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

-- Políticas para registros_rodeio
CREATE POLICY "Users can view farm herd records" ON public.registros_rodeio
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm herd records" ON public.registros_rodeio
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

-- Políticas para registros_suplementacao
CREATE POLICY "Users can view farm supplementation records" ON public.registros_suplementacao
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm supplementation records" ON public.registros_suplementacao
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

-- Políticas para registros_bebedouros
CREATE POLICY "Users can view farm waterer records" ON public.registros_bebedouros
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm waterer records" ON public.registros_bebedouros
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

-- Políticas para registros_movimentacao
CREATE POLICY "Users can view farm movement records" ON public.registros_movimentacao
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm movement records" ON public.registros_movimentacao
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

-- Políticas para registros_enfermaria
CREATE POLICY "Users can view farm infirmary records" ON public.registros_enfermaria
FOR SELECT TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Users can manage farm infirmary records" ON public.registros_enfermaria
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
