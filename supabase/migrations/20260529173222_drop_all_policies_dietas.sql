-- Drop all existing policies
DROP POLICY IF EXISTS "Usuários podem ver dietas da própria fazenda" ON public.dietas;
DROP POLICY IF EXISTS "Usuários podem inserir dietas na própria fazenda" ON public.dietas;
DROP POLICY IF EXISTS "Usuários podem atualizar dietas da própria fazenda" ON public.dietas;
DROP POLICY IF EXISTS "Usuários podem deletar dietas da própria fazenda" ON public.dietas;
DROP POLICY IF EXISTS "Dietas ativas podem ser lidas" ON public.dietas;
DROP POLICY IF EXISTS "Usuários autenticados podem ler dietas" ON public.dietas;;
