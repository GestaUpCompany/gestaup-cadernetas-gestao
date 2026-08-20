-- Desabilitar RLS na tabela medicamentos
ALTER TABLE public.medicamentos DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver medicamentos da própria fazenda" ON public.medicamentos;
DROP POLICY IF EXISTS "Usuários podem inserir medicamentos na própria fazenda" ON public.medicamentos;
DROP POLICY IF EXISTS "Usuários podem atualizar medicamentos da própria fazenda" ON public.medicamentos;
DROP POLICY IF EXISTS "Usuários podem deletar medicamentos da própria fazenda" ON public.medicamentos;;
