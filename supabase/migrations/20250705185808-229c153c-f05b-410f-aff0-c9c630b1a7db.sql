-- Create a function to check if current user is super admin without recursion
-- This function uses the auth.uid() directly against a known super admin ID
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current authenticated user ID matches the known super admin ID
  RETURN auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Super admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Super admin can update users" ON public.users;
DROP POLICY IF EXISTS "Super admin can delete users" ON public.users;
DROP POLICY IF EXISTS "Super admin can select all users" ON public.users;
DROP POLICY IF EXISTS "Admin can view attendant users" ON public.users;

-- Create new policies using the direct ID check
CREATE POLICY "Super admin can insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Super admin can update users" 
ON public.users 
FOR UPDATE 
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admin can delete users" 
ON public.users 
FOR DELETE 
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admin can select all users" 
ON public.users 
FOR SELECT 
USING (public.is_current_user_super_admin());

-- Admin can view attendant users (using direct ID check)
CREATE POLICY "Admin can view attendant users" 
ON public.users 
FOR SELECT 
USING (
  role = 'atendente' 
  AND (
    public.is_current_user_super_admin() 
    OR auth.uid() IN (
      SELECT id FROM public.users 
      WHERE role = 'admin' AND is_active = true
    )
  )
);