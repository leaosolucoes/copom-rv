-- Remover configuração duplicada que pode estar causando problemas
DELETE FROM public.system_settings WHERE key = 'whatsapp_number';

-- Verificar se pg_net está disponível para HTTP calls
DO $$
BEGIN
  -- Testar chamada HTTP simples
  PERFORM net.http_post(
    url := 'https://httpbin.org/post',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"test": "pg_net_working"}'::jsonb
  );
  
  INSERT INTO public.api_logs (
    endpoint,
    method,
    status_code,
    request_body,
    response_body,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    'pg_net_test',
    'POST',
    200,
    '{"test": "pg_net_working"}'::jsonb,
    '{"status": "pg_net_test_successful"}'::jsonb,
    '127.0.0.1',
    'system-test',
    now()
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.api_logs (
    endpoint,
    method,
    status_code,
    request_body,
    error_message,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    'pg_net_test',
    'POST',
    500,
    '{"test": "pg_net_working"}'::jsonb,
    SQLERRM,
    '127.0.0.1',
    'system-test',
    now()
  );
END $$;