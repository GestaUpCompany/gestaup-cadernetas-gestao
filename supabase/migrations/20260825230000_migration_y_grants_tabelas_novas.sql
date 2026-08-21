-- Migration Y: Grants de SELECT/INSERT/UPDATE/DELETE para tabelas novas
--
-- Bug: as migrations B, C e K criaram as tabelas formulacao_categorias_gmd,
-- formulacoes_historico e plano_categoria_personalizacao com RLS habilitado
-- e policies definidas, mas não concederam privilégios básicos (SELECT,
-- INSERT, UPDATE, DELETE) para as roles authenticated e anon.
-- Resultado: 403 Forbidden em todas as queries do frontend para essas tabelas.
--
-- Fix: conceder os privilégios necessários.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.formulacao_categorias_gmd TO authenticated;
GRANT SELECT ON public.formulacao_categorias_gmd TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_categoria_personalizacao TO authenticated;
GRANT SELECT ON public.plano_categoria_personalizacao TO anon;

GRANT SELECT ON public.formulacoes_historico TO authenticated;
GRANT SELECT ON public.formulacoes_historico TO anon;

-- service_role também precisa (embora normalmente bypass RLS, os grants
-- de tabela ainda são necessários para acesso direto)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formulacao_categorias_gmd TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_categoria_personalizacao TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formulacoes_historico TO service_role;
