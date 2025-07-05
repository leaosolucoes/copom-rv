-- CORREÇÃO CRÍTICA: Eliminar recursão infinita nas políticas RLS e corrigir acesso

-- Dropar todas as políticas problemáticas da tabela users
DROP POLICY IF EXISTS "Private settings admin access" ON public.system_settings;
DROP POLICY IF EXISTS "Public settings readable by authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Super admin access" ON public.users;
DROP POLICY IF EXISTS "Admin can view attendant users" ON public.users;
DROP POLICY IF EXISTS "Own record view" ON public.users;
DROP POLICY IF EXISTS "Own record update" ON public.users;

-- Criar políticas não-recursivas para users usando apenas auth.uid()
-- Política para usuários verem próprio perfil (sem recursão)
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (id = auth.uid());

-- Política para usuários atualizarem próprio perfil (sem recursão)
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (id = auth.uid());

-- Política para super admin (usando hardcoded UUID temporariamente para evitar recursão)
CREATE POLICY "Super admin full access" 
ON public.users 
FOR ALL 
USING (auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid);

-- Políticas simplificadas para system_settings (sem recursão)
-- Permitir leitura de configurações públicas para usuários autenticados
CREATE POLICY "Public settings readable" 
ON public.system_settings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (key LIKE 'public_%' OR key = 'form_fields_config')
);

-- Permitir acesso completo para super admin (hardcoded UUID para evitar recursão)
CREATE POLICY "Super admin settings access" 
ON public.system_settings 
FOR ALL 
USING (auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid);

-- Permitir inserção/atualização para usuários autenticados em configurações específicas
CREATE POLICY "Authenticated users can manage form config" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  key = 'form_fields_config'
);

CREATE POLICY "Authenticated users can update form config" 
ON public.system_settings 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  key = 'form_fields_config'
);

-- Corrigir política de complaints que também pode estar causando problemas
DROP POLICY IF EXISTS "Authenticated users can view complaints" ON public.complaints;

CREATE POLICY "Authenticated users can view complaints" 
ON public.complaints 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Garantir que o super admin tem acesso total às denúncias
CREATE POLICY "Super admin complaints access" 
ON public.complaints 
FOR ALL 
USING (auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid);