-- Corrige o schedule do cron update-peso-vivo-daily de 0 0 * * * (meia-noite UTC)
-- para 0 4 * * * (04:00 UTC = meia-noite UTC-4 / America/Sao_Paulo).
--
-- O banco opera em UTC-4. Quando o cron rodava as 00:00 UTC, CURRENT_DATE
-- dentro de update_dados_lotes() ainda era a data do dia anterior em UTC-4,
-- fazendo com que o peso_vivo_atual_kg_cab fosse calculado com um dia a menos
-- de GMD. Isso tambem propagava para o peso_inicio_kg_cab dos planos novos
-- durante migracoes, gerando pesos iniciais subdimensionados em 1 GMD.
--
-- A funcao update_dados_lotes() nao tem SET TimeZone (diferente de
-- migrar_plano_nutricional e update_pesos_individuos, que ja tem
-- SET "TimeZone" TO 'America/Cuiaba'). A correcao ideal seria adicionar
-- SET "TimeZone" TO 'America/Sao_Paulo' na funcao, mas alterar o schedule
-- do cron e mais seguro e nao exige recriar a funcao.

SELECT cron.alter_job(job_id := 7, schedule := '0 4 * * *');
