-- Fix infinite recursion in users table policies
-- Disable RLS temporarily to avoid recursion issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies explicitly
DROP POLICY IF EXISTS "Super admin full access" ON public.users;
DROP POLICY IF EXISTS "Users view own record" ON public.users;
DROP POLICY IF EXISTS "Users update own record" ON public.users;
DROP POLICY IF EXISTS "Super admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Super admin can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admin can view users" ON public.users;
DROP POLICY IF EXISTS "Admin can manage users" ON public.users;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Super admin has full access (using hardcoded UUID to avoid recursion)
CREATE POLICY "Super admin access" 
ON public.users 
FOR ALL 
USING (auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid);

-- Users can view their own record
CREATE POLICY "Own record view" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own record  
CREATE POLICY "Own record update" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);