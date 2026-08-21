-- Remove public policies from pastos
DROP POLICY IF EXISTS "Pastos ativos podem ser lidos" ON public.pastos;
DROP POLICY IF EXISTS "Usuários autenticados podem ler pastos" ON public.pastos;

-- Remove public policies from lotes
DROP POLICY IF EXISTS "Lotes ativos podem ser lidos" ON public.lotes;
DROP POLICY IF EXISTS "Usuários autenticados podem ler lotes" ON public.lotes;;
