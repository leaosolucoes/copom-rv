-- Corrigir políticas RLS para system_settings para permitir que super admins possam salvar configurações

-- Remover política atual
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.system_settings;

-- Criar políticas mais específicas e seguras
CREATE POLICY "Super admin can manage system settings" ON public.system_settings
FOR ALL 
USING (is_current_user_super_admin_custom())
WITH CHECK (is_current_user_super_admin_custom());

CREATE POLICY "Authenticated users can read public settings" ON public.system_settings
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Permitir que funções do sistema também possam acessar
CREATE POLICY "System functions can access settings" ON public.system_settings
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');