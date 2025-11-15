-- Função para buscar logs da API (acesso controlado)
CREATE OR REPLACE FUNCTION public.get_api_logs(
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  token_id UUID,
  request_body JSONB,
  response_body JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.endpoint,
    al.method,
    al.status_code,
    al.ip_address,
    al.user_agent,
    al.created_at,
    al.token_id,
    al.request_body,
    al.response_body
  FROM public.api_logs al
  ORDER BY al.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Garantir que usuários autenticados e anônimos possam chamar a função
GRANT EXECUTE ON FUNCTION public.get_api_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_api_logs TO anon;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_api_logs IS 
'Retorna logs da API para monitoramento. Acesso controlado no nível da aplicação.';