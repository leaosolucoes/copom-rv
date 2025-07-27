-- COMPLETAR IMPLEMENTAÇÃO RLS - Resolver erros restantes

-- HABILITAR RLS nas 3 tabelas restantes que ainda estão desabilitadas
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- CORRIGIR FUNÇÕES SEM search_path definido
-- Atualizar funções existentes para incluir SET search_path

CREATE OR REPLACE FUNCTION public.is_current_user_atendente()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'atendente' 
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role IN ('admin', 'super_admin') 
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_fiscal()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'fiscal' 
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_permission(user_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_uuid 
    AND role::text = required_role 
    AND is_active = true
  ) OR user_uuid = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid;
$$;

CREATE OR REPLACE FUNCTION public.prevent_test_data_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar APENAS dados claramente de teste/simulação
  IF (NEW.complainant_name ~ '^TEST_SIMULATION_[0-9]+$' 
     OR NEW.complainant_name ~ '^Test User [0-9]+$'
     OR NEW.complainant_name = 'João da Silva (TESTE)'
     OR NEW.occurrence_type = 'TESTE_SIMULACAO'
     OR NEW.occurrence_type = 'Teste de Integração WhatsApp'
     OR (NEW.narrative LIKE 'SIMULAÇÃO DE TESTE %' AND NEW.narrative LIKE '%dados fictícios%')
     OR NEW.narrative = 'Esta é uma mensagem de teste do sistema de posturas de Rio Verde para verificar a integração com WhatsApp.')
  THEN
    RAISE EXCEPTION 'Dados de teste automatizados não são permitidos no banco de produção';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_token_id uuid, p_endpoint text, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := date_trunc('hour', now());
  
  SELECT COALESCE(requests_count, 0) INTO current_count
  FROM public.api_rate_limits
  WHERE token_id = p_token_id 
    AND endpoint = p_endpoint 
    AND window_start = window_start_time;
  
  IF current_count IS NULL THEN
    INSERT INTO public.api_rate_limits (token_id, endpoint, requests_count, window_start)
    VALUES (p_token_id, p_endpoint, 1, window_start_time)
    ON CONFLICT (token_id, endpoint, window_start) 
    DO UPDATE SET requests_count = api_rate_limits.requests_count + 1;
    RETURN true;
  END IF;
  
  IF current_count < p_limit THEN
    UPDATE public.api_rate_limits 
    SET requests_count = requests_count + 1
    WHERE token_id = p_token_id 
      AND endpoint = p_endpoint 
      AND window_start = window_start_time;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_api_log(p_token_id uuid, p_endpoint text, p_method text, p_status_code integer, p_execution_time_ms integer, p_ip_address text, p_user_agent text, p_request_body jsonb DEFAULT NULL::jsonb, p_response_body jsonb DEFAULT NULL::jsonb, p_error_message text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.api_logs (
    token_id,
    endpoint,
    method,
    status_code,
    execution_time_ms,
    ip_address,
    user_agent,
    request_body,
    response_body,
    error_message
  ) VALUES (
    p_token_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_execution_time_ms,
    p_ip_address::inet,
    p_user_agent,
    p_request_body,
    p_response_body,
    p_error_message
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_api_token_hash(token_string text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN encode(extensions.digest(token_string, 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.send_whatsapp_direct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  whatsapp_config RECORD;
  phone_numbers TEXT[];
  phone_num TEXT;
  message_text TEXT;
  api_response TEXT;
BEGIN
  -- Verificar se é uma nova denúncia (status 'nova')
  IF NEW.status = 'nova' THEN
    -- Buscar configurações do WhatsApp
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
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_api_token(token_string text)
RETURNS TABLE(token_id uuid, user_id uuid, token_type text, scopes text[], is_valid boolean, rate_limit_per_hour integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  token_hash_value TEXT;
BEGIN
  -- Gerar hash do token
  token_hash_value := public.generate_api_token_hash(token_string);
  
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.token_type,
    t.scopes,
    (t.is_active AND (t.expires_at IS NULL OR t.expires_at > now())) as is_valid,
    t.rate_limit_per_hour
  FROM public.api_tokens t
  WHERE t.token_hash = token_hash_value;
  
  -- Atualizar last_used_at e usage_count
  UPDATE public.api_tokens 
  SET 
    last_used_at = now(),
    usage_count = usage_count + 1
  WHERE token_hash = token_hash_value
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid)
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticate_user(p_email text, p_password text)
RETURNS TABLE(user_id uuid, email text, full_name text, role text, is_active boolean, password_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role::text,
    u.is_active,
    public.verify_password(p_password, u.password_hash) as password_valid
  FROM public.users u
  WHERE u.email = p_email 
    AND u.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the current authenticated user ID matches the known super admin ID
  RETURN coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid) = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_secure(p_email text, p_full_name text, p_password text, p_role text DEFAULT 'atendente'::text, p_is_active boolean DEFAULT true, p_requester_id uuid DEFAULT auth.uid())
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_user_id uuid;
  hashed_password text;
  result json;
BEGIN
  -- Check if requester is super admin (direct check without RLS)
  IF coalesce(p_requester_id, current_setting('app.current_user_id', true)::uuid) != '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid THEN
    RETURN json_build_object('error', 'Access denied: Only super admin can create users');
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
    RETURN json_build_object('error', 'Email already exists');
  END IF;

  -- Hash the password
  SELECT public.hash_password(p_password) INTO hashed_password;
  
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Insert the new user (bypassing RLS due to SECURITY DEFINER)
  INSERT INTO public.users (
    id,
    email,
    full_name,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    p_full_name,
    hashed_password,
    p_role::user_role,
    p_is_active,
    now(),
    now()
  );
  
  -- Return success with user data
  result := json_build_object(
    'success', true,
    'user', json_build_object(
      'id', new_user_id,
      'email', p_email,
      'full_name', p_full_name,
      'role', p_role,
      'is_active', p_is_active
    )
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_secure(p_user_id uuid, p_email text, p_full_name text, p_password text DEFAULT NULL::text, p_role text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean, p_requester_id uuid DEFAULT auth.uid())
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  hashed_password text;
  result json;
BEGIN
  -- Check if requester is super admin
  IF coalesce(p_requester_id, current_setting('app.current_user_id', true)::uuid) != '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid THEN
    RETURN json_build_object('error', 'Access denied: Only super admin can update users');
  END IF;

  -- Hash password if provided
  IF p_password IS NOT NULL AND p_password != '' THEN
    SELECT public.hash_password(p_password) INTO hashed_password;
  END IF;
  
  -- Update the user
  UPDATE public.users SET
    email = p_email,
    full_name = p_full_name,
    password_hash = COALESCE(hashed_password, password_hash),
    role = COALESCE(p_role::user_role, role),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_users_secure(p_requester_id uuid DEFAULT auth.uid())
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  -- Check if requester is super admin
  IF coalesce(p_requester_id, current_setting('app.current_user_id', true)::uuid) != '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'email', email,
      'full_name', full_name,
      'role', role,
      'is_active', is_active,
      'created_at', created_at,
      'last_login', last_login
    ) ORDER BY created_at DESC
  ) INTO result
  FROM public.users;
  
  RETURN json_build_object('success', true, 'users', COALESCE(result, '[]'::json));
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN extensions.crypt(password, extensions.gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN hash = extensions.crypt(password, hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'atendente' THEN 3
      WHEN 'user' THEN 4
    END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_by_id(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id_param 
    AND role = 'super_admin' 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Verifica diretamente pelo UUID conhecido do super admin
  SELECT coalesce(auth.uid(), current_setting('app.current_user_id', true)::uuid) = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid;
$$;

CREATE OR REPLACE FUNCTION public.validate_complaint_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Sanitize and validate phone number
  NEW.complainant_phone = regexp_replace(NEW.complainant_phone, '[^0-9+()\s-]', '', 'g');
  
  -- Validate required fields are not empty after trimming
  IF trim(NEW.complainant_name) = '' THEN
    RAISE EXCEPTION 'Complainant name cannot be empty';
  END IF;
  
  IF trim(NEW.narrative) = '' THEN
    RAISE EXCEPTION 'Narrative cannot be empty';
  END IF;
  
  -- Trim whitespace from text fields
  NEW.complainant_name = trim(NEW.complainant_name);
  NEW.complainant_address = trim(NEW.complainant_address);
  NEW.occurrence_address = trim(NEW.occurrence_address);
  NEW.narrative = trim(NEW.narrative);
  
  -- Limit narrative length
  IF length(NEW.narrative) > 5000 THEN
    RAISE EXCEPTION 'Narrative too long (max 5000 characters)';
  END IF;
  
  RETURN NEW;
END;
$$;