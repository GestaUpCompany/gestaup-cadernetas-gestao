-- Corrigir RLS: faltava GRANT base para a role authenticated
-- RLS policies controlam QUE linhas, mas GRANT controla SE a role pode acessar a tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes_config TO authenticated;

SELECT 'GRANT concedido a authenticated em notificacoes_config' AS status;;
