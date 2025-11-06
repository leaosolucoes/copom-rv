-- Tabela para armazenar métricas de performance
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'page_load', 'api_response', 'supabase_query', 'mapbox_query'
  metric_name TEXT NOT NULL, -- Nome da página ou endpoint
  duration_ms INTEGER NOT NULL, -- Duração em milissegundos
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES public.users(id),
  metadata JSONB DEFAULT '{}'::jsonb, -- Informações adicionais
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user ON public.performance_metrics(user_id);

-- RLS policies
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Todos podem inserir métricas
CREATE POLICY "Anyone can insert metrics"
ON public.performance_metrics
FOR INSERT
WITH CHECK (true);

-- Apenas admins podem ver métricas
CREATE POLICY "Admins can view metrics"
ON public.performance_metrics
FOR SELECT
USING (is_current_user_admin_custom());

-- Comentários
COMMENT ON TABLE public.performance_metrics IS 'Armazena métricas de performance do sistema';
COMMENT ON COLUMN public.performance_metrics.metric_type IS 'Tipo de métrica: page_load, api_response, supabase_query, mapbox_query';
COMMENT ON COLUMN public.performance_metrics.duration_ms IS 'Duração da operação em milissegundos';