SELECT cron.alter_job(
  job_id := 9,
  command := 'select extensions.http_post(
    url := ''https://nrwljcvhwbezmoummxbl.supabase.co/functions/v1/lembrete-tratos-diario'',
    headers := ''{"Content-Type": "application/json"}''::jsonb,
    body := ''{}''::jsonb
  )'
);;
