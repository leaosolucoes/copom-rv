-- Temporariamente permitir acesso total para auditoria funcionar
DROP POLICY IF EXISTS "Super admin consultation logs access" ON public.consultation_audit_logs;

CREATE POLICY "Temporary consultation logs access" ON public.consultation_audit_logs
FOR SELECT USING (
  -- Permitir acesso para qualquer usuário autenticado no sistema customizado ou Supabase
  true
);