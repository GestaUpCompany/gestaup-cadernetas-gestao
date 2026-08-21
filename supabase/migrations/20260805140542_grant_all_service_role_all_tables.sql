-- Concede todos os privilégios DML à service_role em todas as tabelas do schema public.
-- Alinha com o comportamento padrão do Supabase Dashboard (que já faz isso para tabelas criadas pela UI).
-- Tabelas criadas via migração SQL customizada no passado omitiram esse grant, causando
-- 'permission denied for table X' em Edge Functions que usam service_role.
-- service_role tem BYPASSRLS, então o risco de segurança está na guarda da chave, não nos GRANTs.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Também conceder USAGE em sequences (caso exista alguma tabela com serial/bigserial)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;;
