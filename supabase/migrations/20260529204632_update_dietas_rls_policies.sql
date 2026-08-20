-- Enable RLS on dietas table
ALTER TABLE public.dietas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated select dietas" ON public.dietas;
DROP POLICY IF EXISTS "Authenticated insert dietas" ON public.dietas;
DROP POLICY IF EXISTS "Authenticated update dietas" ON public.dietas;
DROP POLICY IF EXISTS "Authenticated delete dietas" ON public.dietas;

-- Create new RLS policies filtering by fazenda_id via usuario_fazenda
CREATE POLICY "Authenticated select dietas"
ON public.dietas
FOR SELECT
TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Authenticated insert dietas"
ON public.dietas
FOR INSERT
TO authenticated
WITH CHECK (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Authenticated update dietas"
ON public.dietas
FOR UPDATE
TO authenticated
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

CREATE POLICY "Authenticated delete dietas"
ON public.dietas
FOR DELETE
TO authenticated
USING (
  fazenda_id IN (
    SELECT fazenda_id 
    FROM public.usuario_fazenda 
    WHERE usuario_id = auth.uid()
  )
);;
