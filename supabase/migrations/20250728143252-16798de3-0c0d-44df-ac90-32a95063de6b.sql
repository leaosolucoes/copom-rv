-- Verificar políticas atuais da tabela system_settings
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'system_settings';

-- Remover política restritiva atual para recriar
DROP POLICY IF EXISTS "Custom settings access" ON public.system_settings;

-- Criar política menos restritiva para system_settings
CREATE POLICY "Usuários autenticados podem acessar configurações" 
ON public.system_settings 
FOR ALL 
USING (
  -- Permitir acesso para super admin ou para chaves públicas
  public.is_current_user_super_admin_custom() OR 
  key ~ '^public_' OR 
  key = 'form_fields_config' OR
  key = 'system_colors' OR
  auth.uid() IS NOT NULL
)
WITH CHECK (
  -- Permitir inserção/atualização para super admin ou usuários autenticados para chaves específicas
  public.is_current_user_super_admin_custom() OR 
  key = 'form_fields_config' OR
  key = 'system_colors' OR
  key = 'public_logo_url' OR
  (auth.uid() IS NOT NULL AND key ~ '^public_')
);