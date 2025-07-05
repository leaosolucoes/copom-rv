-- Fix RLS policies for user creation
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Super admin can manage all users" ON public.users;

-- Create separate policies for different operations
CREATE POLICY "Super admin can insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update users" 
ON public.users 
FOR UPDATE 
USING (public.is_super_admin());

CREATE POLICY "Super admin can delete users" 
ON public.users 
FOR DELETE 
USING (public.is_super_admin());

CREATE POLICY "Super admin can select all users" 
ON public.users 
FOR SELECT 
USING (public.is_super_admin());