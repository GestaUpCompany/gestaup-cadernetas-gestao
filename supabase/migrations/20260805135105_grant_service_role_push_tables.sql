-- Corrige GRANTs faltantes para service_role nas tabelas usadas pela Edge Function lembrete-tratos-diario
-- e GRANTs para authenticated/anon em push_subscriptions (PWA precisa inserir subscriptions)

GRANT SELECT, INSERT, UPDATE, DELETE ON programacao_tratos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON programacao_tratos_percentuais TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON programacao_tratos_currais TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON notificacoes_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO service_role;

-- PWA (authenticated) precisa inserir/listar/deletar suas propias push subscriptions
GRANT SELECT, INSERT, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT, INSERT, DELETE ON push_subscriptions TO anon;;
