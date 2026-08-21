-- Corrige policies de UPDATE que impedem soft delete (PATCH deleted_at)
-- O WITH CHECK (deleted_at IS NULL) rejeita qualquer UPDATE que seta deleted_at,
-- bloqueando o padrão de soft delete usado em todo o painel.
-- O USING (deleted_at IS NULL) já impede que linhas excluídas sejam alteradas.

ALTER POLICY "Authenticated update pastos" ON public.pastos
  USING (deleted_at IS NULL) WITH CHECK (true);

ALTER POLICY "Authenticated update lotes" ON public.lotes
  USING (deleted_at IS NULL) WITH CHECK (true);

ALTER POLICY "Enable update for all authenticated users" ON public.fornecedores
  USING (deleted_at IS NULL) WITH CHECK (true);

ALTER POLICY "Authenticated update" ON public.racas
  USING (deleted_at IS NULL) WITH CHECK (true);;
