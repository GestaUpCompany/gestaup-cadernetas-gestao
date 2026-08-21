-- Desabilitar RLS na tabela registros_problemas
ALTER TABLE public.registros_problemas DISABLE ROW LEVEL SECURITY;

-- Conceder permissões ao anon para SELECT, INSERT, UPDATE
GRANT SELECT ON public.registros_problemas TO anon;
GRANT INSERT ON public.registros_problemas TO anon;
GRANT UPDATE ON public.registros_problemas TO anon;

-- Garantir que DELETE não seja concedido
REVOKE DELETE ON public.registros_problemas FROM anon;;
