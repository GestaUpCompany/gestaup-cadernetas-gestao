-- Drop all existing policies including the one that already exists
DROP POLICY IF EXISTS "Usuários podem ver rações da própria fazenda" ON public.racao;
DROP POLICY IF EXISTS "Usuários podem inserir rações na própria fazenda" ON public.racao;
DROP POLICY IF EXISTS "Usuários podem atualizar rações da própria fazenda" ON public.racao;
DROP POLICY IF EXISTS "Usuários podem deletar rações da própria fazenda" ON public.racao;
DROP POLICY IF EXISTS "Rações ativas podem ser lidas" ON public.racao;
DROP POLICY IF EXISTS "Usuários autenticados podem ler rações" ON public.racao;;
