-- Corrigir política de consulta de logs de auditoria para incluir verificação por ID do super admin
DROP POLICY IF EXISTS "Admin consultation logs access" ON public.consultation_audit_logs;

CREATE POLICY "Super admin consultation logs access" ON public.consultation_audit_logs
FOR SELECT USING (
  -- Super admin específico pelo ID
  COALESCE(auth.uid(), current_setting('app.current_user_id', true)::uuid) = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid OR
  -- Função helper para super admin
  is_current_user_super_admin_custom() OR 
  -- Função helper para admin
  is_current_user_admin_custom() OR
  -- Próprio usuário pode ver seus logs
  (user_id = COALESCE(auth.uid(), current_setting('app.current_user_id', true)::uuid))
);