-- Função para buscar métricas de performance (acesso controlado)
CREATE OR REPLACE FUNCTION public.get_performance_metrics(
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  metric_type TEXT,
  metric_name TEXT,
  duration_ms INTEGER,
  metric_timestamp TIMESTAMP WITH TIME ZONE,
  success BOOLEAN,
  error_message TEXT,
  metadata JSONB,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.metric_type,
    pm.metric_name,
    pm.duration_ms,
    pm.timestamp as metric_timestamp,
    pm.success,
    pm.error_message,
    pm.metadata,
    pm.user_id,
    pm.created_at
  FROM public.performance_metrics pm
  WHERE pm.timestamp >= start_time
  ORDER BY pm.timestamp DESC
  LIMIT limit_count;
END;
$$;

-- Garantir que usuários autenticados e anônimos possam chamar a função
GRANT EXECUTE ON FUNCTION public.get_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_metrics TO anon;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_performance_metrics IS 
'Retorna métricas de performance para monitoramento. Acesso controlado no nível da aplicação.';