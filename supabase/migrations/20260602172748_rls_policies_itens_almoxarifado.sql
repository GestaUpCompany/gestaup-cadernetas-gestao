-- Enable RLS
ALTER TABLE public.itens_almoxarifado ENABLE ROW LEVEL SECURITY;

-- Create simple policies like pastos (allow all authenticated users)
CREATE POLICY "Authenticated select itens_almoxarifado"
ON public.itens_almoxarifado FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert itens_almoxarifado"
ON public.itens_almoxarifado FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update itens_almoxarifado"
ON public.itens_almoxarifado FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated delete itens_almoxarifado"
ON public.itens_almoxarifado FOR DELETE
TO authenticated
USING (true);;
