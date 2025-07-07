-- Remover trigger duplicado que está causando envio duplo de WhatsApp
DROP TRIGGER IF EXISTS trigger_send_whatsapp_notification ON public.complaints;