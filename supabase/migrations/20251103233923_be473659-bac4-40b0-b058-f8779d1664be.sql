-- Correção de avisos de segurança

-- 1. Adicionar políticas RLS para tabelas sem políticas

-- user_roles - apenas super admin e o próprio usuário podem ver roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admin can manage roles" ON public.user_roles FOR ALL USING (public.is_current_user_super_admin_custom());

-- audit_logs - apenas admin pode ver logs
CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_current_user_admin_custom());
CREATE POLICY "Super admin can manage audit logs" ON public.audit_logs FOR ALL USING (public.is_current_user_super_admin_custom());

-- api_logs - apenas admin pode ver
CREATE POLICY "Admin can view api logs" ON public.api_logs FOR SELECT USING (public.is_current_user_admin_custom());

-- api_rate_limits - sistema interno, sem acesso direto
CREATE POLICY "Admin can view rate limits" ON public.api_rate_limits FOR SELECT USING (public.is_current_user_admin_custom());

-- api_endpoints - apenas admin pode gerenciar
CREATE POLICY "Admin can view api endpoints" ON public.api_endpoints FOR SELECT USING (public.is_current_user_admin_custom());

-- historico_km_viaturas - fiscais e admins podem ver histórico
CREATE POLICY "Fiscais can view km history" ON public.historico_km_viaturas FOR SELECT USING (public.is_current_user_fiscal() OR public.is_current_user_admin_custom());
CREATE POLICY "Super admin can manage km history" ON public.historico_km_viaturas FOR ALL USING (public.is_current_user_super_admin_custom());