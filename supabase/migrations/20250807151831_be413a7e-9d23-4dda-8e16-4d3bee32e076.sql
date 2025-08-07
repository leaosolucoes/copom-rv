-- Criar novas configurações para WhatsApp de verificação
INSERT INTO public.system_settings (key, value, description) VALUES 
  ('whatsapp_verify_auto_send_enabled', 'false', 'Habilitar envio automático de WhatsApp quando denúncia for para verificação'),
  ('whatsapp_verify_phone_numbers', '[""]', 'Números de telefone para receber notificações de verificação (separados por vírgula)'),
  ('whatsapp_verify_message_template', '["Olá! Temos uma nova denúncia para verificar no sistema. Acesse agora e verifique ou arquive a denúncia."]', 'Template da mensagem para notificações de verificação')
ON CONFLICT (key) DO NOTHING;

-- Remover o trigger atual
DROP TRIGGER IF EXISTS send_whatsapp_direct_trigger ON public.complaints;

-- Modificar a função para incluir detecção de mudança de status para verificação
CREATE OR REPLACE FUNCTION public.send_whatsapp_direct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  whatsapp_config RECORD;
  phone_numbers TEXT[];
  phone_num TEXT;
  message_text TEXT;
  api_response TEXT;
BEGIN
  -- Verificar se é uma nova denúncia (INSERT com status 'nova')
  IF TG_OP = 'INSERT' AND NEW.status = 'nova' THEN
    -- Buscar configurações do WhatsApp para denúncias novas
    SELECT 
      (SELECT value FROM public.system_settings WHERE key = 'whatsapp_auto_send_enabled')::boolean as auto_send_enabled,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_api_key') as api_key,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_api_url') as api_url,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_instance_name') as instance_name,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_phone_number') as phone_number,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_message_template') as message_template
    INTO whatsapp_config;
    
    -- Verificar se o envio automático está habilitado
    IF whatsapp_config.auto_send_enabled AND 
       whatsapp_config.api_key IS NOT NULL AND 
       whatsapp_config.api_url IS NOT NULL AND 
       whatsapp_config.phone_number IS NOT NULL THEN
      
      -- Preparar mensagem
      message_text := COALESCE(whatsapp_config.message_template, 'Nova denúncia de ' || NEW.complainant_name);
      
      -- Substituir placeholders principais
      message_text := REPLACE(message_text, '{complainant_name}', COALESCE(NEW.complainant_name, ''));
      message_text := REPLACE(message_text, '{complainant_phone}', COALESCE(NEW.complainant_phone, ''));
      message_text := REPLACE(message_text, '{complainant_type}', COALESCE(NEW.complainant_type, ''));
      message_text := REPLACE(message_text, '{occurrence_type}', COALESCE(NEW.occurrence_type, ''));
      message_text := REPLACE(message_text, '{narrative}', COALESCE(NEW.narrative, ''));
      
      -- Substituir placeholders de endereço do denunciante
      message_text := REPLACE(message_text, '{complainant_address}', COALESCE(NEW.complainant_address, ''));
      message_text := REPLACE(message_text, '{complainant_number}', COALESCE(NEW.complainant_number, ''));
      message_text := REPLACE(message_text, '{complainant_block}', COALESCE(NEW.complainant_block, ''));
      message_text := REPLACE(message_text, '{complainant_lot}', COALESCE(NEW.complainant_lot, ''));
      message_text := REPLACE(message_text, '{complainant_neighborhood}', COALESCE(NEW.complainant_neighborhood, ''));
      
      -- Substituir placeholders de local da ocorrência
      message_text := REPLACE(message_text, '{occurrence_address}', COALESCE(NEW.occurrence_address, ''));
      message_text := REPLACE(message_text, '{occurrence_number}', COALESCE(NEW.occurrence_number, ''));
      message_text := REPLACE(message_text, '{occurrence_block}', COALESCE(NEW.occurrence_block, ''));
      message_text := REPLACE(message_text, '{occurrence_lot}', COALESCE(NEW.occurrence_lot, ''));
      message_text := REPLACE(message_text, '{occurrence_neighborhood}', COALESCE(NEW.occurrence_neighborhood, ''));
      message_text := REPLACE(message_text, '{occurrence_reference}', COALESCE(NEW.occurrence_reference, ''));
      
      -- Processar números de telefone (separados por vírgula)
      phone_numbers := string_to_array(whatsapp_config.phone_number, ',');
      
      -- Enviar para cada número
      FOREACH phone_num IN ARRAY phone_numbers
      LOOP
        phone_num := TRIM(phone_num);
        IF LENGTH(phone_num) > 0 THEN
          BEGIN
            -- Fazer chamada HTTP direta para Evolution API
            SELECT net.http_post(
              url := whatsapp_config.api_url || '/message/sendText/' || whatsapp_config.instance_name,
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'apikey', whatsapp_config.api_key
              ),
              body := jsonb_build_object(
                'number', phone_num,
                'text', message_text
              )
            ) INTO api_response;
            
            -- Log da tentativa de envio
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
              'whatsapp_direct_send',
              'POST',
              200,
              jsonb_build_object(
                'complaintId', NEW.id,
                'phone', phone_num,
                'trigger', 'direct'
              ),
              jsonb_build_object('response_id', api_response),
              '127.0.0.1',
              'trigger-direct',
              now()
            );
            
          EXCEPTION WHEN OTHERS THEN
            -- Log de erro
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
              'whatsapp_direct_send',
              'POST',
              500,
              jsonb_build_object(
                'complaintId', NEW.id,
                'phone', phone_num,
                'trigger', 'direct'
              ),
              SQLERRM,
              '127.0.0.1',
              'trigger-direct',
              now()
            );
          END;
        END IF;
      END LOOP;
      
      -- Marcar como enviado
      NEW.whatsapp_sent := true;
    END IF;
  END IF;
  
  -- Verificar se é uma mudança de status para verificação (UPDATE de 'nova' para 'a_verificar')
  IF TG_OP = 'UPDATE' AND OLD.status = 'nova' AND NEW.status = 'a_verificar' THEN
    -- Buscar configurações do WhatsApp para verificação
    SELECT 
      (SELECT value FROM public.system_settings WHERE key = 'whatsapp_verify_auto_send_enabled')::boolean as auto_send_enabled,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_api_key') as api_key,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_api_url') as api_url,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_instance_name') as instance_name,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_verify_phone_numbers') as phone_number,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_verify_message_template') as message_template
    INTO whatsapp_config;
    
    -- Verificar se o envio automático está habilitado para verificação
    IF whatsapp_config.auto_send_enabled AND 
       whatsapp_config.api_key IS NOT NULL AND 
       whatsapp_config.api_url IS NOT NULL AND 
       whatsapp_config.phone_number IS NOT NULL THEN
      
      -- Preparar mensagem específica para verificação
      message_text := COALESCE(whatsapp_config.message_template, 'Olá! Temos uma nova denúncia para verificar no sistema. Acesse agora e verifique ou arquive a denúncia.');
      
      -- Substituir placeholders básicos se necessário
      message_text := REPLACE(message_text, '{complainant_name}', COALESCE(NEW.complainant_name, ''));
      message_text := REPLACE(message_text, '{occurrence_type}', COALESCE(NEW.occurrence_type, ''));
      
      -- Processar números de telefone (separados por vírgula)
      phone_numbers := string_to_array(whatsapp_config.phone_number, ',');
      
      -- Enviar para cada número
      FOREACH phone_num IN ARRAY phone_numbers
      LOOP
        phone_num := TRIM(phone_num);
        IF LENGTH(phone_num) > 0 THEN
          BEGIN
            -- Fazer chamada HTTP direta para Evolution API
            SELECT net.http_post(
              url := whatsapp_config.api_url || '/message/sendText/' || whatsapp_config.instance_name,
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'apikey', whatsapp_config.api_key
              ),
              body := jsonb_build_object(
                'number', phone_num,
                'text', message_text
              )
            ) INTO api_response;
            
            -- Log da tentativa de envio para verificação
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
              'whatsapp_verify_send',
              'POST',
              200,
              jsonb_build_object(
                'complaintId', NEW.id,
                'phone', phone_num,
                'trigger', 'verify'
              ),
              jsonb_build_object('response_id', api_response),
              '127.0.0.1',
              'trigger-verify',
              now()
            );
            
          EXCEPTION WHEN OTHERS THEN
            -- Log de erro para verificação
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
              'whatsapp_verify_send',
              'POST',
              500,
              jsonb_build_object(
                'complaintId', NEW.id,
                'phone', phone_num,
                'trigger', 'verify'
              ),
              SQLERRM,
              '127.0.0.1',
              'trigger-verify',
              now()
            );
          END;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar o novo trigger para INSERT e UPDATE
CREATE TRIGGER send_whatsapp_direct_trigger
  BEFORE INSERT OR UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.send_whatsapp_direct();