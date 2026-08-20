
-- Allow admin users full access to lote_categorias without farm linkage
CREATE POLICY "Allow admin full access on lote_categorias"
ON public.lote_categorias
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_id = auth.uid() AND u.papel = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_id = auth.uid() AND u.papel = 'admin'
  )
);
;
