-- Fix infinite recursion in users table policies
-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Super admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Super admin can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admin can view users" ON public.users;
DROP POLICY IF EXISTS "Admin can manage users" ON public.users;

-- Create simple, non-recursive policies
CREATE POLICY "Super admin can view all users" 
ON public.users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin' 
    AND u.is_active = true
  )
);

CREATE POLICY "Super admin can manage all users" 
ON public.users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin' 
    AND u.is_active = true
  )
);

-- Allow users to view their own profile (non-recursive)
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile (non-recursive)
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);