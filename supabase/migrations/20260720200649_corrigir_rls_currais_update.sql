
-- Restaurar o curral que foi soft-deleted no teste
UPDATE public.currais SET deleted_at = NULL WHERE id = '3d30f755-df83-48dd-9456-78d8465d3fc6';

-- Dropar e recriar a policy de UPDATE com WITH CHECK explícito
DROP POLICY IF EXISTS "Authenticated update currais" ON public.currais;

CREATE POLICY "Authenticated update currais" ON public.currais
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);
;
