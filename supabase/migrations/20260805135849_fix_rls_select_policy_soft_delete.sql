-- Fix: PostgreSQL 17 aplica SELECT policy USING como WITH CHECK em UPDATEs.
-- Tables com SELECT policy USING (deleted_at IS NULL) não podem fazer soft-delete
-- porque a nova linha (com deleted_at non-null) falha o check.
-- Solução: mudar SELECT policy para USING (true) e filtrar deleted_at no frontend.

-- fornecedores
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.fornecedores;
CREATE POLICY "Enable read access for all authenticated users" ON public.fornecedores
  FOR SELECT TO authenticated
  USING (true);

-- lotes
DROP POLICY IF EXISTS "Authenticated select lotes" ON public.lotes;
CREATE POLICY "Authenticated select lotes" ON public.lotes
  FOR SELECT TO authenticated
  USING (true);

-- racas (authenticated)
DROP POLICY IF EXISTS "Authenticated select" ON public.racas;
CREATE POLICY "Authenticated select" ON public.racas
  FOR SELECT TO authenticated
  USING (true);

-- racas (public - anon)
DROP POLICY IF EXISTS "Racas ativas podem ser lidas" ON public.racas;
CREATE POLICY "Racas ativas podem ser lidas" ON public.racas
  FOR SELECT
  USING (true);;
