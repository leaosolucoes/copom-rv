-- Ajustar formatação da data do imprevisto para o formato brasileiro DD/MM/YYYY HH:MM
CREATE OR REPLACE FUNCTION public.send_whatsapp_imprevisto_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  whatsapp_config RECORD;
  phone_numbers TEXT[];
  phone_num TEXT;
  message_text TEXT;
  viatura_info RECORD;
  motorista_info RECORD;
  escala_info RECORD;
  api_response TEXT;
  data_imprevisto_formatada TEXT;
BEGIN
  -- Verificar se é um novo imprevisto (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Buscar configurações do WhatsApp para imprevistos
    SELECT 
      (SELECT value FROM public.system_settings WHERE key = 'whatsapp_imprevisto_auto_send_enabled')::boolean as auto_send_enabled,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_api_key') as api_key,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_api_url') as api_url,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_instance_name') as instance_name,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_imprevisto_phone_numbers') as phone_number,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_imprevisto_message_template') as message_template
    INTO whatsapp_config;
    
    -- Verificar se o envio automático está habilitado
    IF whatsapp_config.auto_send_enabled AND 
       whatsapp_config.api_key IS NOT NULL AND 
       whatsapp_config.api_url IS NOT NULL AND 
       whatsapp_config.phone_number IS NOT NULL AND 
       whatsapp_config.phone_number != '' THEN
      
      -- Buscar informações da escala para obter dados da viatura
      SELECT ev.viatura_id 
      INTO escala_info
      FROM public.escalas_viaturas ev 
      WHERE ev.id = NEW.escala_id;
      
      -- Buscar informações da viatura
      SELECT prefixo, modelo, placa 
      INTO viatura_info
      FROM public.viaturas 
      WHERE id = escala_info.viatura_id;
      
      -- Buscar informações do motorista
      SELECT full_name 
      INTO motorista_info
      FROM public.users 
      WHERE id = NEW.motorista_id;
      
      -- Formatar data do imprevisto no formato brasileiro DD/MM/YYYY HH:MM
      -- Converter para timezone do Brasil e formatar
      SELECT to_char(NEW.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
      INTO data_imprevisto_formatada;
      
      -- Preparar mensagem
      message_text := COALESCE(whatsapp_config.message_template, 'Imprevisto reportado na viatura ' || COALESCE(viatura_info.prefixo, ''));
      
      -- Substituir placeholders
      message_text := REPLACE(message_text, '{viatura_prefixo}', COALESCE(viatura_info.prefixo, ''));
      message_text := REPLACE(message_text, '{viatura_modelo}', COALESCE(viatura_info.modelo, ''));
      message_text := REPLACE(message_text, '{viatura_placa}', COALESCE(viatura_info.placa, ''));
      message_text := REPLACE(message_text, '{motorista_nome}', COALESCE(motorista_info.full_name, ''));
      message_text := REPLACE(message_text, '{data_imprevisto}', data_imprevisto_formatada);
      message_text := REPLACE(message_text, '{descricao_imprevisto}', COALESCE(NEW.descricao_imprevisto, 'Nenhuma descrição informada'));
      
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
              'whatsapp_imprevisto_send',
              'POST',
              200,
              jsonb_build_object(
                'imprevistoId', NEW.id,
                'phone', phone_num,
                'trigger', 'imprevisto_viatura'
              ),
              jsonb_build_object('response_id', api_response),
              '127.0.0.1',
              'trigger-imprevisto',
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
              'whatsapp_imprevisto_send',
              'POST',
              500,
              jsonb_build_object(
                'imprevistoId', NEW.id,
                'phone', phone_num,
                'trigger', 'imprevisto_viatura'
              ),
              SQLERRM,
              '127.0.0.1',
              'trigger-imprevisto',
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