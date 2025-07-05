-- Remover todas as políticas problemáticas da tabela users
DROP POLICY IF EXISTS "Super admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Super admin can insert users" ON public.users;  
DROP POLICY IF EXISTS "Super admin can update users" ON public.users;
DROP POLICY IF EXISTS "Super admin can delete users" ON public.users;

-- Criar função para verificar se o usuário atual é super admin (sem recursão)
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin_safe()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Verifica diretamente pelo UUID conhecido do super admin
  SELECT auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid;
$$;

-- Criar políticas simples usando a função segura
CREATE POLICY "Super admin full access to users" 
ON public.users 
FOR ALL 
USING (public.is_current_user_super_admin_safe() OR id = auth.uid())
WITH CHECK (public.is_current_user_super_admin_safe());