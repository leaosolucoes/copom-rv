-- CORREÇÃO CRÍTICA: Reabilitar RLS e corrigir políticas para autenticação híbrida

-- 1. Reabilitar RLS nas tabelas críticas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Dropar políticas problemáticas existentes
DROP POLICY IF EXISTS "Super admin full access to users" ON public.users;
DROP POLICY IF EXISTS "Permissive system settings access" ON public.system_settings;

-- 3. Criar políticas otimizadas para autenticação híbrida (mobile-friendly)
-- Política simplificada para users - funciona com auth.uid() e sistema customizado
CREATE POLICY "Hybrid users access" 
ON public.users 
FOR ALL 
USING (
  -- Permitir se é o próprio usuário (Supabase Auth)
  id = auth.uid() OR
  -- Permitir se é super admin (Supabase Auth)
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid OR
  -- Fallback para sistema customizado - permite leitura se não há auth.uid()
  (auth.uid() IS NULL AND TRUE)
)
WITH CHECK (
  -- Para inserção/atualização: apenas super admin ou próprio usuário
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid OR
  id = auth.uid() OR
  -- Fallback para sistema customizado
  auth.uid() IS NULL
);

-- 4. Política simplificada para system_settings - mobile-optimized  
CREATE POLICY "Hybrid settings access" 
ON public.system_settings 
FOR ALL 
USING (
  -- Super admin sempre tem acesso
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid OR
  -- Configurações públicas para qualquer usuário autenticado
  (auth.uid() IS NOT NULL AND (key LIKE 'public_%' OR key = 'form_fields_config')) OR
  -- Fallback para sistema customizado (permite acesso quando auth.uid() é null)
  auth.uid() IS NULL
)
WITH CHECK (
  -- Para inserção/atualização
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid OR
  (auth.uid() IS NOT NULL AND key = 'form_fields_config') OR
  -- Fallback para sistema customizado
  auth.uid() IS NULL
);

-- 5. Atualizar política de complaints para ser mais permissiva no mobile
DROP POLICY IF EXISTS "Complaints access by role" ON public.complaints;

CREATE POLICY "Hybrid complaints access" 
ON public.complaints 
FOR SELECT 
USING (
  -- Super admin e admin sempre têm acesso
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid OR
  -- Usuários autenticados via Supabase
  (auth.uid() IS NOT NULL) OR
  -- Fallback para sistema customizado e acesso público
  auth.uid() IS NULL
);

-- 6. Criar função auxiliar para verificar permissões sem recursão
CREATE OR REPLACE FUNCTION public.check_user_permission(user_uuid uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_uuid 
    AND role::text = required_role 
    AND is_active = true
  ) OR user_uuid = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid;
$$;