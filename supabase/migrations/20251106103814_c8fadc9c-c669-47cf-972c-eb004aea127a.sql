-- Criar tabela de configuração de alertas
CREATE TABLE IF NOT EXISTS public.alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  email_recipients TEXT[] NOT NULL DEFAULT '{}',
  whatsapp_recipients TEXT[] NOT NULL DEFAULT '{}',
  thresholds JSONB NOT NULL DEFAULT '{
    "hourly_increase_percent": 100,
    "daily_increase_percent": 50,
    "unusual_hour_threshold": 10,
    "unusual_hour_min": 0,
    "unusual_hour_max": 6
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de histórico de alertas
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  sent_email BOOLEAN NOT NULL DEFAULT false,
  sent_whatsapp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "geral" ON public.alert_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "geral" ON public.alert_history FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_alert_settings_updated_at
  BEFORE UPDATE ON public.alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão se não existir
INSERT INTO public.alert_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.alert_settings);
