-- Reativar RLS na tabela consultation_audit_logs
ALTER TABLE public.consultation_audit_logs ENABLE ROW LEVEL SECURITY;

-- Verificar se as políticas existem e estão corretas
DROP POLICY IF EXISTS "Super admin can view all consultation logs" ON public.consultation_audit_logs;
DROP POLICY IF EXISTS "Users can view own consultation logs" ON public.consultation_audit_logs;
DROP POLICY IF EXISTS "System can insert consultation logs" ON public.consultation_audit_logs;

-- Recriar políticas
CREATE POLICY "Super admin can view all consultation logs" 
ON public.consultation_audit_logs FOR SELECT 
USING (is_current_user_super_admin_safe());

CREATE POLICY "Users can view own consultation logs" 
ON public.consultation_audit_logs FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert consultation logs" 
ON public.consultation_audit_logs FOR INSERT 
WITH CHECK (true);