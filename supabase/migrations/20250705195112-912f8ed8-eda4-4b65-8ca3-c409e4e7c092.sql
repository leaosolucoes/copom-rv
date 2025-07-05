-- Fix infinite recursion in users table policies by recreating them properly
-- Drop ALL existing policies on users table (comprehensive cleanup)
DO $$ 
BEGIN
  -- Drop all policies that might exist
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
  END LOOP;
END $$;

-- Create simple, non-recursive policies for users table
CREATE POLICY "Super admin full access" 
ON public.users 
FOR ALL 
USING (
  auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid
);

CREATE POLICY "Users view own record" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users update own record" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);