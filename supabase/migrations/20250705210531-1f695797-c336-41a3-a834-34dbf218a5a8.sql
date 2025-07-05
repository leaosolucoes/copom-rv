-- Criar função para envio automático de WhatsApp
CREATE OR REPLACE FUNCTION public.send_whatsapp_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas enviar para denúncias novas
  IF NEW.status = 'nova' THEN
    -- Chamar a edge function de forma assíncrona
    PERFORM net.http_post(
      url := 'https://smytdnkylauxocqrkchn.supabase.co/functions/v1/send-whatsapp',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteXRkbmt5bGF1eG9jcXJrY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ3OTAsImV4cCI6MjA2NzMxMDc5MH0.lw_fYUvIUY7Q9OPumJLD9rP-oG3p4OcLs_PKl6MgN0Y"}'::jsonb,
      body := jsonb_build_object('complaintId', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para envio automático
CREATE OR REPLACE TRIGGER trigger_send_whatsapp_notification
  AFTER INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.send_whatsapp_notification();

-- Habilitar a extensão pg_net se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;