
-- Fix the infinite recursion in RLS policies for users table
-- The issue is that policies are referencing the same table they're protecting

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Super Admin pode gerenciar todos usuários" ON public.users;
DROP POLICY IF EXISTS "Admin pode ver usuários atendentes" ON public.users;

-- Create new policies that avoid recursion by using direct auth.uid() comparisons
-- and avoiding subqueries that reference the same table

-- Policy for users to see their own profile
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (id = auth.uid());

-- Policy for super admin to manage all users (using a function to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Super admin can manage all users" 
ON public.users 
FOR ALL 
USING (public.is_super_admin());

-- Policy for admin to see attendant users
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admin can view attendant users" 
ON public.users 
FOR SELECT 
USING (
  role = 'atendente' 
  AND public.is_admin_or_super_admin()
);

-- Also fix the complaints policies that might have similar issues
DROP POLICY IF EXISTS "Usuários autenticados podem ver denúncias" ON public.complaints;

CREATE POLICY "Authenticated users can view complaints" 
ON public.complaints 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);
