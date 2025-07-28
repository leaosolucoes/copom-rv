-- Ajustar políticas RLS da tabela access_audit_logs para usar a mesma configuração da consultation_audit_logs

-- Remover política de SELECT restritiva atual
DROP POLICY IF EXISTS "Super admin can view all access logs" ON public.access_audit_logs;

-- Criar nova política de SELECT que permite acesso temporário (mesma da consultation_audit_logs)
CREATE POLICY "Temporary access logs access" 
ON public.access_audit_logs 
FOR SELECT 
USING (true);

-- A política de INSERT já está correta (System can insert access logs)