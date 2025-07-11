-- Remove o trigger que envia WhatsApp automaticamente para evitar duplicação
-- quando denúncias são criadas via API
DROP TRIGGER IF EXISTS trigger_send_whatsapp_on_new_complaint ON public.complaints;