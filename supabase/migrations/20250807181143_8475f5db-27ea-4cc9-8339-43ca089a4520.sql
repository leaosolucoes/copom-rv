-- Adicionar configurações WhatsApp para checklist reprovado
INSERT INTO public.system_settings (key, value, description) VALUES 
(
  'whatsapp_checklist_auto_send_enabled', 
  'false'::jsonb, 
  'Envio automático habilitado para checklist reprovado'
),
(
  'whatsapp_checklist_phone_numbers', 
  '""'::jsonb, 
  'Números do WhatsApp para notificações de checklist reprovado'
),
(
  'whatsapp_checklist_message_template', 
  '"🚨 *CHECKLIST REPROVADO*\n\n📋 *Sistema de Posturas - Rio Verde*\n\n🚗 *DADOS DA VIATURA:*\n• Prefixo: {viatura_prefixo}\n• Modelo: {viatura_modelo}\n• Placa: {viatura_placa}\n\n👤 *FISCAL RESPONSÁVEL:*\n{fiscal_nome}\n\n📅 *DATA/HORÁRIO DO CHECKLIST:*\n{data_checklist} - {horario_checklist}\n\n⚠️ *STATUS:*\nREPROVADO\n\n📝 *OBSERVAÇÕES/ALTERAÇÕES:*\n{observacoes_alteracoes}\n\n🔧 *AÇÃO NECESSÁRIA:*\nViatura requer atenção imediata. Acesse o sistema para mais detalhes.\n\n🏛️ *Secretaria Municipal de Posturas*\n_Acesse o sistema para acompanhamento._"'::jsonb, 
  'Template da mensagem para checklist reprovado'
)
ON CONFLICT (key) DO NOTHING;

-- Criar trigger para envio automático de WhatsApp quando checklist for reprovado
CREATE OR REPLACE FUNCTION public.send_whatsapp_checklist_notification()
RETURNS TRIGGER AS $$
DECLARE
  whatsapp_config RECORD;
  phone_numbers TEXT[];
  phone_num TEXT;
  message_text TEXT;
  viatura_info RECORD;
  fiscal_info RECORD;
  api_response TEXT;
BEGIN
  -- Verificar se é checklist reprovado (INSERT com status 'reprovado' ou UPDATE para 'reprovado')
  IF (TG_OP = 'INSERT' AND NEW.status_aprovacao = 'reprovado') OR 
     (TG_OP = 'UPDATE' AND OLD.status_aprovacao != 'reprovado' AND NEW.status_aprovacao = 'reprovado') THEN
    
    -- Buscar configurações do WhatsApp para checklist reprovado
    SELECT 
      (SELECT value FROM public.system_settings WHERE key = 'whatsapp_checklist_auto_send_enabled')::boolean as auto_send_enabled,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_api_key') as api_key,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_api_url') as api_url,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_instance_name') as instance_name,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_checklist_phone_numbers') as phone_number,
      (SELECT value->>0 FROM public.system_settings WHERE key = 'whatsapp_checklist_message_template') as message_template
    INTO whatsapp_config;
    
    -- Verificar se o envio automático está habilitado
    IF whatsapp_config.auto_send_enabled AND 
       whatsapp_config.api_key IS NOT NULL AND 
       whatsapp_config.api_url IS NOT NULL AND 
       whatsapp_config.phone_number IS NOT NULL AND 
       whatsapp_config.phone_number != '' THEN
      
      -- Buscar informações da viatura
      SELECT prefixo, modelo, placa 
      INTO viatura_info
      FROM public.viaturas 
      WHERE id = NEW.viatura_id;
      
      -- Buscar informações do fiscal
      SELECT full_name 
      INTO fiscal_info
      FROM public.users 
      WHERE id = NEW.fiscal_id;
      
      -- Preparar mensagem
      message_text := COALESCE(whatsapp_config.message_template, 'Checklist reprovado para viatura ' || COALESCE(viatura_info.prefixo, ''));
      
      -- Substituir placeholders
      message_text := REPLACE(message_text, '{viatura_prefixo}', COALESCE(viatura_info.prefixo, ''));
      message_text := REPLACE(message_text, '{viatura_modelo}', COALESCE(viatura_info.modelo, ''));
      message_text := REPLACE(message_text, '{viatura_placa}', COALESCE(viatura_info.placa, ''));
      message_text := REPLACE(message_text, '{fiscal_nome}', COALESCE(fiscal_info.full_name, ''));
      message_text := REPLACE(message_text, '{data_checklist}', COALESCE(NEW.data_checklist::text, ''));
      message_text := REPLACE(message_text, '{horario_checklist}', COALESCE(NEW.horario_checklist::text, ''));
      message_text := REPLACE(message_text, '{observacoes_alteracoes}', COALESCE(NEW.observacoes_alteracoes, 'Nenhuma observação informada'));
      
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
              'whatsapp_checklist_send',
              'POST',
              200,
              jsonb_build_object(
                'checklistId', NEW.id,
                'phone', phone_num,
                'trigger', 'checklist_reprovado'
              ),
              jsonb_build_object('response_id', api_response),
              '127.0.0.1',
              'trigger-checklist',
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
              'whatsapp_checklist_send',
              'POST',
              500,
              jsonb_build_object(
                'checklistId', NEW.id,
                'phone', phone_num,
                'trigger', 'checklist_reprovado'
              ),
              SQLERRM,
              '127.0.0.1',
              'trigger-checklist',
              now()
            );
          END;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger na tabela checklist_viaturas
DROP TRIGGER IF EXISTS trigger_whatsapp_checklist_notification ON public.checklist_viaturas;
CREATE TRIGGER trigger_whatsapp_checklist_notification
  AFTER INSERT OR UPDATE ON public.checklist_viaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.send_whatsapp_checklist_notification();