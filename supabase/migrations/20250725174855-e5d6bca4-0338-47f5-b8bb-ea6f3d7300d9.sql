-- Recriar função de trigger para envio automático de WhatsApp
DROP TRIGGER IF EXISTS send_whatsapp_notification_trigger ON public.complaints;
DROP FUNCTION IF EXISTS public.send_whatsapp_notification();

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION public.send_whatsapp_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é uma nova denúncia (status 'nova')
  IF NEW.status = 'nova' THEN
    -- Verificar se o envio automático está habilitado
    PERFORM 1 FROM public.system_settings 
    WHERE key = 'whatsapp_auto_send_enabled' 
    AND value = true;
    
    IF FOUND THEN
      -- Chamar a edge function de forma assíncrona usando pg_net
      PERFORM net.http_post(
        url := 'https://smytdnkylauxocqrkchn.supabase.co/functions/v1/send-whatsapp',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteXRkbmt5bGF1eG9jcXJrY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ3OTAsImV4cCI6MjA2NzMxMDc5MH0.lw_fYUvIUY7Q9OPumJLD9rP-oG3p4OcLs_PKl6MgN0Y'
        ),
        body := jsonb_build_object('complaintId', NEW.id)
      );
      
      -- Log da tentativa de envio
      INSERT INTO public.api_logs (
        endpoint,
        method,
        status_code,
        request_body,
        ip_address,
        user_agent,
        created_at
      ) VALUES (
        '/functions/v1/send-whatsapp',
        'POST',
        200,
        jsonb_build_object('complaintId', NEW.id, 'auto_trigger', true),
        '127.0.0.1',
        'auto-trigger',
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa APÓS inserção de nova denúncia
CREATE TRIGGER send_whatsapp_notification_trigger
  AFTER INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.send_whatsapp_notification();

-- Inserir configuração padrão para auto envio se não existir
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'whatsapp_auto_send_enabled',
  true,
  'Habilita o envio automático de WhatsApp para novas denúncias'
) ON CONFLICT (key) DO NOTHING;

-- Log da criação do trigger
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
  'trigger_creation',
  'SETUP',
  200,
  jsonb_build_object('trigger_name', 'send_whatsapp_notification_trigger'),
  jsonb_build_object('status', 'created', 'function', 'send_whatsapp_notification'),
  '127.0.0.1',
  'system-setup',
  now()
);