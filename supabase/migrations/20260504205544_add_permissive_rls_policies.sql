-- Adicionar políticas permissivas para leitura por usuários autenticados
DROP POLICY IF EXISTS "Admins podem ler pastos" ON public.pastos;
DROP POLICY IF EXISTS "Controllers podem ler pastos" ON public.pastos;
DROP POLICY IF EXISTS "Peões podem ler pastos da sua fazenda" ON public.pastos;
CREATE POLICY "Enable read access for all authenticated users" ON public.pastos
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins podem ler lotes" ON public.lotes;
DROP POLICY IF EXISTS "Controllers podem ler lotes" ON public.lotes;
DROP POLICY IF EXISTS "Peões podem ler lotes da sua fazenda" ON public.lotes;
CREATE POLICY "Enable read access for all authenticated users" ON public.lotes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Peões podem ler frigorificos da sua fazenda" ON public.frigorificos;
CREATE POLICY "Enable read access for all authenticated users" ON public.frigorificos
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Peões podem ler mineral da sua fazenda" ON public.mineral;
CREATE POLICY "Enable read access for all authenticated users" ON public.mineral
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins podem ler insumos" ON public.insumos;
DROP POLICY IF EXISTS "Controllers podem ler insumos" ON public.insumos;
DROP POLICY IF EXISTS "Peões podem ler insumos da sua fazenda" ON public.insumos;
CREATE POLICY "Enable read access for all authenticated users" ON public.insumos
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Peões podem ler proteinado da sua fazenda" ON public.proteinado;
CREATE POLICY "Enable read access for all authenticated users" ON public.proteinado
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Peões podem ler racao da sua fazenda" ON public.racao;
CREATE POLICY "Enable read access for all authenticated users" ON public.racao
  FOR SELECT USING (auth.role() = 'authenticated');;
