ALTER TABLE public.registros_manutencao_maquinas ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read registros_manutencao_maquinas
CREATE POLICY "Authenticated select registros_manutencao_maquinas"
ON public.registros_manutencao_maquinas FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert registros_manutencao_maquinas
CREATE POLICY "Authenticated insert registros_manutencao_maquinas"
ON public.registros_manutencao_maquinas FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update registros_manutencao_maquinas
CREATE POLICY "Authenticated update registros_manutencao_maquinas"
ON public.registros_manutencao_maquinas FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete registros_manutencao_maquinas
CREATE POLICY "Authenticated delete registros_manutencao_maquinas"
ON public.registros_manutencao_maquinas FOR DELETE
TO authenticated
USING (true);;
