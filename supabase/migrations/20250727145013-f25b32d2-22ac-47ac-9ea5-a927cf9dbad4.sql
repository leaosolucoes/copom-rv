-- Criar ENUM para tipos de consulta
CREATE TYPE consultation_type AS ENUM ('CPF', 'CNPJ', 'CEP');

-- Criar tabela específica para auditoria de consultas
CREATE TABLE public.consultation_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  consultation_type consultation_type NOT NULL,
  searched_data TEXT NOT NULL,
  search_result JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.consultation_audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas Super Admin pode ver todos os logs
CREATE POLICY "Super admin can view all consultation logs" 
ON public.consultation_audit_logs 
FOR SELECT 
USING (is_current_user_super_admin_safe());

-- Política: Usuários podem ver apenas seus próprios logs
CREATE POLICY "Users can view own consultation logs" 
ON public.consultation_audit_logs 
FOR SELECT 
USING (user_id = auth.uid());

-- Política: Sistema pode inserir logs
CREATE POLICY "System can insert consultation logs" 
ON public.consultation_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX idx_consultation_audit_user_id ON public.consultation_audit_logs(user_id);
CREATE INDEX idx_consultation_audit_type ON public.consultation_audit_logs(consultation_type);
CREATE INDEX idx_consultation_audit_created_at ON public.consultation_audit_logs(created_at);
CREATE INDEX idx_consultation_audit_searched_data ON public.consultation_audit_logs(searched_data);

-- Trigger para atualização automática de updated_at (se necessário)
CREATE TRIGGER update_consultation_audit_logs_updated_at
BEFORE UPDATE ON public.consultation_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();