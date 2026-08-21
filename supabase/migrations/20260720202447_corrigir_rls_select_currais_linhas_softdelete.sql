
-- Currais: SELECT policy deve permitir ler rows mesmo após soft delete
-- (PostgREST retorna a row atualizada após PATCH, e o filtro deleted_at IS NULL
-- é feito no frontend via .is('deleted_at', null))
DROP POLICY IF EXISTS "Authenticated select currais" ON public.currais;
CREATE POLICY "Authenticated select currais" ON public.currais
  FOR SELECT TO authenticated
  USING (true);

-- Linhas_confinamento: mesmo padrão
DROP POLICY IF EXISTS "Authenticated select linhas_confinamento" ON public.linhas_confinamento;
CREATE POLICY "Authenticated select linhas_confinamento" ON public.linhas_confinamento
  FOR SELECT TO authenticated
  USING (true);
;
