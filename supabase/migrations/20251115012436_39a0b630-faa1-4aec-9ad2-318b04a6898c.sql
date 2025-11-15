-- Função para buscar tentativas de login (acesso controlado)
CREATE OR REPLACE FUNCTION public.get_login_attempts(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  email_attempted TEXT,
  success BOOLEAN,
  failed_reason TEXT,
  captcha_required BOOLEAN,
  captcha_completed BOOLEAN,
  blocked BOOLEAN,
  block_duration_seconds INTEGER,
  geolocation JSONB,
  device_info JSONB,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.created_at,
    la.ip_address,
    la.user_agent,
    la.email_attempted,
    la.success,
    la.failed_reason,
    la.captcha_required,
    la.captcha_completed,
    la.blocked,
    la.block_duration_seconds,
    la.geolocation,
    la.device_info,
    la.user_id
  FROM public.login_attempts la
  WHERE la.created_at >= start_date
  ORDER BY la.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Garantir que usuários autenticados e anônimos possam chamar a função
GRANT EXECUTE ON FUNCTION public.get_login_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_login_attempts TO anon;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_login_attempts IS 
'Retorna tentativas de login para monitoramento. Acesso controlado no nível da aplicação.';