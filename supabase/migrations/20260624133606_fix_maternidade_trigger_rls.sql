
-- As funções triggers de maternidade que inserem em `individuos` são SECURITY INVOKER.
-- No Supabase/PostgREST, triggers SECURITY INVOKER falham ao inserir em tabelas com RLS
-- porque o contexto de autenticação do usuário não é propagado corretamente.
-- Alterando para SECURITY DEFINER para que executem com privilégios do owner.

ALTER FUNCTION public.create_individual_from_maternidade() SECURITY DEFINER;
ALTER FUNCTION public.ensure_mother_from_maternidade() SECURITY DEFINER;
;
