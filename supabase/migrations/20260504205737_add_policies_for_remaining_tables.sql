-- Adicionar políticas permissivas para dietas e fornecedores
DROP POLICY IF EXISTS "Peões podem ler dietas da sua fazenda" ON public.dietas;
CREATE POLICY "Enable read access for all authenticated users" ON public.dietas
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Peões podem ler fornecedores da sua fazenda" ON public.fornecedores;
CREATE POLICY "Enable read access for all authenticated users" ON public.fornecedores
  FOR SELECT USING (auth.role() = 'authenticated');

-- Adicionar políticas para fazendas (leitura pública por acesso_id)
DROP POLICY IF EXISTS "Admin full access" ON public.fazendas;
DROP POLICY IF EXISTS "Controller fazendas" ON public.fazendas;
DROP POLICY IF EXISTS "Public read fazendas by acesso_id" ON public.fazendas;
CREATE POLICY "Public read by acesso_id" ON public.fazendas
  FOR SELECT USING (true);;
