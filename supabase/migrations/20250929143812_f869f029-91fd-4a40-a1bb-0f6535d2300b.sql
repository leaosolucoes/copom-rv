-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job para executar APENAS às 07:00 todos os dias
-- Substituir qualquer job anterior
SELECT cron.schedule(
  'auto-encerrar-escalas-job',
  '0 7 * * *', -- Todos os dias às 07:00
  $$
  SELECT
    net.http_post(
        url:='https://smytdnkylauxocqrkchn.supabase.co/functions/v1/auto-encerrar-escalas',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteXRkbmt5bGF1eG9jcXJrY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ3OTAsImV4cCI6MjA2NzMxMDc5MH0.lw_fYUvIUY7Q9OPumJLD9rP-oG3p4OcLs_PKl6MgN0Y"}'::jsonb,
        body:=concat('{"scheduled_execution": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);