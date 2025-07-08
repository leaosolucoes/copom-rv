-- Criar tabela para gerenciar tokens de API (sandbox e produção)
CREATE TABLE public.api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('sandbox', 'production')),
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para logs de requisições da API
CREATE TABLE public.api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID REFERENCES public.api_tokens(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_body JSONB,
  response_body JSONB,
  ip_address INET,
  user_agent TEXT,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para rate limiting
CREATE TABLE public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES public.api_tokens(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token_id, endpoint, window_start)
);

-- Criar tabela para configuração de endpoints da API
CREATE TABLE public.api_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  method TEXT NOT NULL,
  description TEXT,
  required_scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para api_tokens
CREATE POLICY "Super admin can manage all API tokens"
ON public.api_tokens
FOR ALL
USING (is_current_user_super_admin_safe());

CREATE POLICY "Users can view own API tokens"
ON public.api_tokens
FOR SELECT
USING (user_id = auth.uid());

-- Políticas RLS para api_logs
CREATE POLICY "Super admin can view all API logs"
ON public.api_logs
FOR SELECT
USING (is_current_user_super_admin_safe());

CREATE POLICY "Token owners can view their logs"
ON public.api_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.api_tokens 
    WHERE api_tokens.id = api_logs.token_id 
    AND api_tokens.user_id = auth.uid()
  )
);

-- Políticas RLS para api_rate_limits
CREATE POLICY "Super admin can manage rate limits"
ON public.api_rate_limits
FOR ALL
USING (is_current_user_super_admin_safe());

-- Políticas RLS para api_endpoints
CREATE POLICY "Super admin can manage API endpoints"
ON public.api_endpoints
FOR ALL
USING (is_current_user_super_admin_safe());

CREATE POLICY "Everyone can view enabled endpoints"
ON public.api_endpoints
FOR SELECT
USING (is_enabled = true);

-- Triggers para updated_at
CREATE TRIGGER update_api_tokens_updated_at
BEFORE UPDATE ON public.api_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_endpoints_updated_at
BEFORE UPDATE ON public.api_endpoints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar hash de token
CREATE OR REPLACE FUNCTION public.generate_api_token_hash(token_string TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(digest(token_string, 'sha256'), 'hex');
END;
$$;

-- Função para validar token de API
CREATE OR REPLACE FUNCTION public.validate_api_token(token_string TEXT)
RETURNS TABLE(
  token_id UUID,
  user_id UUID,
  token_type TEXT,
  scopes TEXT[],
  is_valid BOOLEAN,
  rate_limit_per_hour INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_hash TEXT;
BEGIN
  token_hash := public.generate_api_token_hash(token_string);
  
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.token_type,
    t.scopes,
    (t.is_active AND (t.expires_at IS NULL OR t.expires_at > now())) as is_valid,
    t.rate_limit_per_hour
  FROM public.api_tokens t
  WHERE t.token_hash = validate_api_token.token_hash;
  
  -- Atualizar last_used_at e usage_count
  UPDATE public.api_tokens 
  SET 
    last_used_at = now(),
    usage_count = usage_count + 1
  WHERE token_hash = validate_api_token.token_hash
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

-- Função para verificar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_token_id UUID,
  p_endpoint TEXT,
  p_limit INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := date_trunc('hour', now());
  
  -- Obter contagem atual para esta hora
  SELECT COALESCE(requests_count, 0) INTO current_count
  FROM public.api_rate_limits
  WHERE token_id = p_token_id 
    AND endpoint = p_endpoint 
    AND window_start = window_start_time;
  
  -- Se não existe registro, criar um
  IF current_count IS NULL THEN
    INSERT INTO public.api_rate_limits (token_id, endpoint, requests_count, window_start)
    VALUES (p_token_id, p_endpoint, 1, window_start_time)
    ON CONFLICT (token_id, endpoint, window_start) 
    DO UPDATE SET requests_count = api_rate_limits.requests_count + 1;
    RETURN true;
  END IF;
  
  -- Verificar se ainda está dentro do limite
  IF current_count < p_limit THEN
    -- Incrementar contador
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