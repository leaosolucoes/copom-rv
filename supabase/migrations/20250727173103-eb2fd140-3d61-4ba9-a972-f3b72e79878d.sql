-- Corrigir política de consulta de logs de auditoria para permitir acesso aos administradores
DROP POLICY IF EXISTS "Custom consultation logs access" ON public.consultation_audit_logs;

CREATE POLICY "Admin consultation logs access" ON public.consultation_audit_logs
FOR SELECT USING (
  is_current_user_super_admin_custom() OR 
  is_current_user_admin_custom() OR
  (user_id = COALESCE(auth.uid(), current_setting('app.current_user_id', true)::uuid))
);