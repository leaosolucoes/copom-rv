-- Fix infinite recursion in system_settings policies
-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Super Admin pode gerenciar configurações" ON public.system_settings;
DROP POLICY IF EXISTS "Usuários autenticados podem ver configurações públicas" ON public.system_settings;

-- Create simple, non-recursive policies for system_settings
-- Super admin can manage all settings (using hardcoded UUID to avoid recursion)
CREATE POLICY "Super admin manages settings" 
ON public.system_settings 
FOR ALL 
USING (auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid);

-- Authenticated users can view public settings (non-recursive)
CREATE POLICY "Public settings viewable" 
ON public.system_settings 
FOR SELECT 
USING (
  (key LIKE 'public_%') OR 
  (auth.uid() = '7c67cbf3-b43a-40ca-9adf-d78484ce3549'::uuid)
);