-- Habilitar as extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configurar cron job para encerrar escalas automaticamente a cada 5 minutos
SELECT cron.schedule(
  'auto-encerrar-escalas-vencidas',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
        url:='https://smytdnkylauxocqrkchn.supabase.co/functions/v1/auto-encerrar-escalas',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteXRkbmt5bGF1eG9jcXJrY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ3OTAsImV4cCI6MjA2NzMxMDc5MH0.lw_fYUvIUY7Q9OPumJLD9rP-oG3p4OcLs_PKl6MgN0Y"}'::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Verificar se o cron job foi criado
SELECT * FROM cron.job WHERE jobname = 'auto-encerrar-escalas-vencidas';