-- Criar tabela para auditoria de acessos
CREATE TABLE public.access_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  login_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_timestamp TIMESTAMP WITH TIME ZONE NULL,
  session_duration_minutes INTEGER NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  device_type TEXT NULL,
  browser_name TEXT NULL,
  operating_system TEXT NULL,
  location_country TEXT NULL,
  location_region TEXT NULL,
  location_city TEXT NULL,
  login_method TEXT NOT NULL DEFAULT 'email_password',
  login_success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.access_audit_logs ENABLE ROW LEVEL SECURITY;

-- Política para super admin visualizar todos os logs
CREATE POLICY "Super admin can view all access logs" 
ON public.access_audit_logs 
FOR SELECT 
USING (is_current_user_super_admin_safe());

-- Política para inserir logs de acesso (sistema)
CREATE POLICY "System can insert access logs" 
ON public.access_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Índices para melhor performance
CREATE INDEX idx_access_audit_logs_user_id ON public.access_audit_logs(user_id);
CREATE INDEX idx_access_audit_logs_login_timestamp ON public.access_audit_logs(login_timestamp);
CREATE INDEX idx_access_audit_logs_user_role ON public.access_audit_logs(user_role);
CREATE INDEX idx_access_audit_logs_login_success ON public.access_audit_logs(login_success);