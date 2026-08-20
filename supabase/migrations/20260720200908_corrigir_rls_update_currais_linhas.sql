
-- Corrigir currais: with_check deve permitir deleted_at preenchido (soft delete)
DROP POLICY IF EXISTS "Authenticated update currais" ON public.currais;
CREATE POLICY "Authenticated update currais" ON public.currais
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Corrigir linhas_confinamento: mesmo padrão
DROP POLICY IF EXISTS "Authenticated update linhas_confinamento" ON public.linhas_confinamento;
CREATE POLICY "Authenticated update linhas_confinamento" ON public.linhas_confinamento
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);
;
