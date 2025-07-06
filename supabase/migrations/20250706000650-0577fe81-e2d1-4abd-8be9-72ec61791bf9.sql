-- Verificar se o trigger para envio automático de WhatsApp existe e está ativo
-- Se não existir, criar o trigger para enviar WhatsApp automaticamente quando uma nova denúncia for inserida

-- Primeiro, garantir que a função de envio existe
CREATE OR REPLACE FUNCTION public.send_whatsapp_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas enviar para denúncias novas
  IF NEW.status = 'nova' THEN
    -- Chamar a edge function de forma assíncrona usando pg_net
    PERFORM net.http_post(
      url := 'https://smytdnkylauxocqrkchn.supabase.co/functions/v1/send-whatsapp',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNteXRkbmt5bGF1eG9jcXJrY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzQ3OTAsImV4cCI6MjA2NzMxMDc5MH0.lw_fYUvIUY7Q9OPumJLD9rP-oG3p4OcLs_PKl6MgN0Y"}'::jsonb,
      body := jsonb_build_object('complaintId', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Dropar o trigger se existir para recriá-lo
DROP TRIGGER IF EXISTS trigger_send_whatsapp_on_new_complaint ON public.complaints;

-- Criar o trigger para executar após inserção de nova denúncia
CREATE TRIGGER trigger_send_whatsapp_on_new_complaint
    AFTER INSERT ON public.complaints
    FOR EACH ROW
    EXECUTE FUNCTION public.send_whatsapp_notification();